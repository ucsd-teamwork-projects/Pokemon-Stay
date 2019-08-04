$(document).ready(function () {
    var users = {};
    var currentUser;
    var usersRef = database.ref().child("users");
    var currentUserRef;
    var pokemonList = [];
    var userTeam;

    function startGame() {
        setTimeout(function () {
            $("#pokemonSelection").hide();
        }, 3000)
    }

    function shrinkLogo() {
        $("#gameLogo").animate({
            "width": "30%"
        });
    }

    function loadUserParty(location) {
        $.each(userTeam, function (id, pokemon) {
            $(`<img title="${id}" src="${pokemon.spriteFront}">`).appendTo($(location));
        })
    }

    function getCurrentTime() {
        return moment().format('LLLL');
    }

    function addPokemonToParty(species, name, previewDiv) {
        var queryURL = `https://pokeapi.co/api/v2/pokemon/${species.toLowerCase()}`;
        $.ajax({
            url: queryURL,
            method: "GET"
        }).then(function (response) {
            // new pokemon object
            var pokemon = {
                species: species,
                metOn: getCurrentTime(),
                spriteFront: response.sprites.front_default,
                spriteBack: response.sprites.back_default
            };

            usersRef.child(currentUser).child("pokemonParty").child(name).update(pokemon);

            if (previewDiv !== '') {
                $(previewDiv).html(`<img src=${pokemon.spriteFront}>`);
            }


        })
    }

    // FUNCTION TO AUTOCOMPLETE STARTER POKEMON CHOOSER
    $(function () {
        //RETRIEVE JSON DATA FROM API
        $.getJSON("https://pokeapi.co/api/v2/pokemon?limit=964",
            function (response) {
                var pokedexData = response.results;
                // FOR EACH POKEMON IN DATA, PUSH TO LOCAL POKEDEX
                $.each(pokedexData, function (id, pokemon) {
                    var capitalizedName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
                    pokemonList.push(capitalizedName);
                })

            })
        // USE JQUERY UI TO AUTOCOMPLETE FORM 
        $("#pokemonSelector").autocomplete({
            source: pokemonList
        });

    });

    // Load user array on change (ie. new users were added)
    usersRef.on("value", function (snapshot) {
        users = snapshot;
    });

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
                userTeam = snapshot.val().pokemonParty;
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

        //verify pokemon name

        //  If pokemon does not exist...
        if (pokemonList.indexOf(speciesName) === -1) {
            $("#pokemon-dne-error").text("Please select an existing Pokemon.");
        }
        //  If pokemon does exist...
        else {
            $("#pokemon-dne-error").text("");

            var name = speciesName;
            addPokemonToParty(speciesName, name, "#pokemonPreview");

            startGame();


        }



    })

})