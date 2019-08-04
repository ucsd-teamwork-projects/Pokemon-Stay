$(document).ready(function () {
    ///////////////////////////////////////////////////////////
    // MAIN GAME VARIABLES
    ///////////////////////////////////////////////////////////
    var users, userParty;
    var currentUser;

    var usersRef = database.ref().child("users");
    var currentUserRef;

    var pokemonNamesList = [];
    var pokemonList = {};

    ///////////////////////////////////////////////////////////
    // PERFORM ON PAGE LOAD
    ///////////////////////////////////////////////////////////

    // LOAD ALL POKEMON AND THEIR SPRITES
    var queryURL = `https://pokeapi.co/api/v2/pokemon?limit=964`;
    $.ajax({
        url: queryURL,
        method: "GET"
    }).then(function (listOfPokemon) {
        $.each(listOfPokemon.results, function (id, pokemon) {
            var capitalizedName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
            pokemonNamesList.push(capitalizedName);
            queryURL = pokemon.url;
            $.ajax({
                url: queryURL,
                method: "GET"
            }).then(function (pokemonInfo) {
                pokemonList[pokemonInfo.name] = {
                    spriteFront: pokemonInfo.sprites.front_default,
                    spriteBack: pokemonInfo.sprites.back_default
                }
            });
        })

    })

    ///////////////////////////////////////////////////////////
    // FIREBASE WATCHER FUNCTIONS
    ///////////////////////////////////////////////////////////

    // Load user array on change (ie. new users were added)
    usersRef.on("value", function (snapshot) {
        users = snapshot;
    });

    ///////////////////////////////////////////////////////////
    // HELPER FUNCTIONS
    ///////////////////////////////////////////////////////////

    // FUNCTION TO AUTOCOMPLETE STARTER POKEMON CHOOSER
    $(function () {
        // USE JQUERY UI TO AUTOCOMPLETE FORM 
        $("#pokemonSelector").autocomplete({
            source: pokemonNamesList
        });

    });

    function shrinkLogo() {
        $("#gameLogo").animate({
            "width": "50%"
        });
    }

    function loadUserParty(location) {
        $.each(userParty, function (id, pokemon) {
            $(`<img title="${id}" src="${getSprite(pokemon.species).front}">`).appendTo($(location));
        })
    }

    function getCurrentTime() {
        return moment().format('LLLL');
    }

    function getSprite(pokemonName) {
        return {
            front: pokemonList[pokemonName.toLowerCase()].spriteFront,
            back: pokemonList[pokemonName.toLowerCase()].spriteBack
        };
    }

    function addPokemonToParty(species, previewDiv) {
        var name = prompt("What would you like to name this Pokemon? ('.' and '/' are not allowed)", species);
        var pokemon = {
            species: species,
            metOn: getCurrentTime(),
        };

        usersRef.child(currentUser).child("pokemonParty").child(name).update(pokemon);

        if (previewDiv !== '') {
            $(previewDiv).html(`<img src=${getSprite(species).front}>`);
        }

    }

    function verifyPokemon(species) {
        pokemonNamesList.indexOf(species) === -1
    }

    ///////////////////////////////////////////////////////////
    // MAIN FUNCTIONS
    ///////////////////////////////////////////////////////////

    function startGame() {
        setTimeout(function () {
            $("#pokemonSelection").hide();
        }, 3000)
    }

    // Checks if an account linked to the username exists
    $("#resumeGameButton").click(function () {
        var username = $("#username-input").val();
        // verify username exists; if not, display error
        if (users.child(username).exists()) {
            $("#gameMenu").hide();
            $("#resumeMenu").show();
            shrinkLogo();

            //Save user name locally
            currentUser = username;
            currentUserRef = usersRef.child(currentUser);

            //Display user greeting
            $("#userGreeting").html(`Welcome back, &nbsp;${currentUser}`)

            //Display user current Pokemon party
            currentUserRef.on("value", function (snapshot) {
                userParty = snapshot.val().pokemonParty;
                loadUserParty("#pokemonPartyPreview");
            })


        } else {
            $("#user-dne-error").html("User does not exist!<br>Please select a valid user or start a new game.")
        }
    })

    $("#newGameButton").click(function () {
        var newUsername = $("#username-input").val();
        currentUser = newUsername;

        // userAccount object
        var userAccount = {
            userLocation: ''
        };

        // Set new user account in Firebase realtime database
        currentUserRef = usersRef.child(currentUser);
        currentUserRef.set(userAccount);

        // Hide Menu and Show Pokemon Selection page
        $("#gameMenu").hide();
        shrinkLogo();
        $("#pokemonSelection").show();

    })

    $("#selectStarterButton").click(function () {

        var speciesName = $("#pokemonSelector").val();

        //  If pokemon does not exist...
        if (verifyPokemon(speciesName)) {
            $("#pokemon-dne-error").text("Please select an existing Pokemon.");
        }
        //  If pokemon does exist...
        else {
            $("#pokemon-dne-error").text("");

            addPokemonToParty(speciesName, "#pokemonPreview");

            startGame();


        }



    })

})