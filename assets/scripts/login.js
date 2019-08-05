$(document).ready(function () {
    ///////////////////////////////////////////////////////////
    // MAIN GAME VARIABLES
    ///////////////////////////////////////////////////////////
    var users, userParty, userInventory;
    var currentUser;

    var usersRef = database.ref().child("users");
    var currentUserRef;

    var pokemonNamesList = [];
    var pokemonList = {};

    ///////////////////////////////////////////////////////////
    // PERFORM ON PAGE LOAD
    ///////////////////////////////////////////////////////////

    // LOAD ALL POKEMON INFO (NAMES, SPRITES, MOVES, TYPES)
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
                // Check if all pokemon have been loaded
                if (pokemonNamesList.length === 964) {
                    $("#loading").hide();
                    $("#gameDisplay").fadeIn();
                }
                var types = [];
                // var moves = [];

                $.each(pokemonInfo.types, function (id, typeInfo) {
                    types.push(typeInfo.type.name)
                })

                // $.each(pokemonInfo.moves, function (id, moveInfo) {
                //     moves.push(moveInfo.move.name);
                // })
                pokemonList[pokemonInfo.name] = {
                    spriteFront: pokemonInfo.sprites.front_default,
                    spriteBack: pokemonInfo.sprites.back_default,
                    icon: `https://img.pokemondb.net/sprites/sun-moon/icon/${pokemonInfo.name}.png`,
                    types: types
                    // moves: moves
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

    function loadUserParty(location, wrapSprites, classes) {
        $(location).empty();
        // The number of columns each sprite should occupy
        var columns = '2';

        if (wrapSprites && Object.keys(userParty).length <= 4) {
            columns = '6';
        } else if (wrapSprites && Object.keys(userParty).length > 4) {
            columns = '4';
        }

        $.each(userParty, function (id, pokemon) {
            var sprite = $(`<img title="${pokemon.name} (${pokemon.species})" data-id=${id} data-species="${pokemon.species}" data-name="${pokemon.name}" src="${getSprite(pokemon.species).front}">`);
            sprite.addClass(classes);
            sprite.addClass("img-fluid");
            var spriteDiv = $(`<div class='justify-content-center col-${columns}'>`).append(sprite);

            spriteDiv.appendTo($(location));
        })

    }

    function loadUserInventory(location) {
        $(location).empty();
        $.each(userInventory, function (id, pokemon) {
            $(`<img class="inventoryPokemon" data-id=${id} data-species="${pokemon.species}" data-name="${pokemon.name}" title="${pokemon.name} (${pokemon.species})" src="${getSprite(pokemon.species).icon}">`).appendTo($(location));
        })
    }

    function getCurrentTime() {
        return moment().format('LLLL');
    }

    function getSprite(pokemonName) {
        return {
            front: pokemonList[pokemonName.toLowerCase()].spriteFront,
            back: pokemonList[pokemonName.toLowerCase()].spriteBack,
            icon: pokemonList[pokemonName.toLowerCase()].icon
        };
    }

    function addNewPokemon(destination, species, previewDiv) {
        var name = species;
        name = prompt("What would you like to name this Pokemon? ('.' and '/' are not allowed)", species);
        var destinationRef;

        if (destination === 'party') {
            // ERROR CHECKING TO SEE IF PARTY ALREADY HAS SIX POKEMON
            destinationRef = usersRef.child(currentUser).child("pokemonParty").push();
        } else if (destination === 'pc') {
            destinationRef = usersRef.child(currentUser).child("pokemonPC").push();
        }

        var pokemon = {
            name: name,
            ID: destinationRef.key,
            species: species,
            metOn: getCurrentTime(),
        };

        destinationRef.update(pokemon);

        if (previewDiv !== '') {
            $(previewDiv).html(`<img src=${getSprite(species).front}>`);
        }

    }

    function isPokemon(species) {
        pokemonNamesList.indexOf(species) === -1
    }

    function loadPokemonInfoModal(origin, selectedPokemon) {
        $("#pokemonInfoTitle").text(selectedPokemon.attr("title"));
        $("#pokemonInfoPreview").html(
            `<img src="${getSprite(selectedPokemon.attr("data-species")).front}">`
        );
        $("#pokemonInfoName").text(selectedPokemon.attr("data-name"));
        $("#pokemonInfoSpecies").text(selectedPokemon.attr("data-species"));

        if (origin === 'party') {
            $("#pokemonInfoDate").text(userParty[selectedPokemon.attr("data-id")].metOn);
        } else if (origin === 'pc') {
            $("#pokemonInfoDate").text(userInventory[selectedPokemon.attr("data-id")].metOn);
        }

        $('#pokemonInfo').modal('toggle')
    }

    $(document).on("click", ".inventoryPokemon", function () {
        $("#viewStatsButton").show();
        $("#addToPartyButton").show();
        $(".inventoryPokemon").removeClass("selectedInventoryPokemon");
        $(this).addClass("selectedInventoryPokemon");

    })

    $(document).on("click", ".partyPokemon", function () {
        loadPokemonInfoModal('party', $(this));

    })

    $("#viewStatsButton").click(function () {
        var selectedPokemon = $(".selectedInventoryPokemon");

        loadPokemonInfoModal('pc', selectedPokemon);

    })

    $("#addToPartyButton").click(function () {
        loadUserParty("#pokemonPartyPCpreview", false, "partyPCpokemon");
        $("#pokemonPartyPCpreview").show();
    })

    $(".partyPCpokemon").click(function () {

    })

    $(".partyPokemon").click(function () {

    })

    $('#pokemonPC').on('hidden.bs.modal', function () {
        $("#viewStatsButton").hide();
        $("#addToPartyButton").hide();
        $("#pokemonPartyPCpreview").hide();

    });



    ///////////////////////////////////////////////////////////
    // MAIN FUNCTIONS
    ///////////////////////////////////////////////////////////

    function startGame() {
        $("#gameMenu").hide();
        $("#pokemonSelection").hide();
        $("#trainerDashboard").fadeIn();

        //Display user greeting
        $("#userGreeting").html(`Welcome back, &nbsp;${currentUser}`)

        //Display user current Pokemon party
        currentUserRef.on("value", function (snapshot) {
            userParty = snapshot.val().pokemonParty;
            loadUserParty("#pokemonPartyPreview", true, "partyPokemon");
        })
    }

    // Checks if an account linked to the username exists
    $("#resumeGameButton").click(function () {
        var username = $("#username-input").val();
        // verify username exists; if not, display error
        if (users.child(username).exists()) {
            //Save user name locally
            currentUser = username;
            currentUserRef = usersRef.child(currentUser);

            startGame();

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
        $("#pokemonSelection").fadeIn();

    })

    $("#selectStarterButton").click(function () {

        var speciesName = $("#pokemonSelector").val();

        //  If pokemon does not exist...
        if (isPokemon(speciesName)) {
            $("#pokemon-dne-error").text("Please select an existing Pokemon.");
        }
        //  If pokemon does exist...
        else {
            $("#pokemon-dne-error").text("");

            addNewPokemon('party', speciesName, "#pokemonPreview");

            startGame();


        }
    })

    $("#viewPCbutton").click(function () {
        //Load user caught Pokemon
        currentUserRef.on("value", function (snapshot) {
            userInventory = snapshot.val().pokemonPC;
            loadUserInventory("#pokemonPCview");
        })

    })

})