$(document).ready(function () {
    ///////////////////////////////////////////////////////////
    // MAIN GAME VARIABLES
    ///////////////////////////////////////////////////////////
    var users, userTrainer, userParty, userInventory;
    var currentUser;

    var usersRef = database.ref().child("users");
    var currentUserRef;

    var pokemonNamesList = [];
    var pokemonList = {};

    var map, infoWindow, geocoder;

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
                // var types = [];
                // var moves = [];

                // $.each(pokemonInfo.types, function (id, typeInfo) {
                //     types.push(typeInfo.type.name)
                // })

                // $.each(pokemonInfo.moves, function (id, moveInfo) {
                //     moves.push(moveInfo.move.name);
                // })
                pokemonList[pokemonInfo.name] = {
                    spriteFront: pokemonInfo.sprites.front_default,
                    spriteBack: pokemonInfo.sprites.back_default,
                    icon: `https://img.pokemondb.net/sprites/sun-moon/icon/${pokemonInfo.name}.png`
                    // types: types
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

        if (userParty) {
            if (wrapSprites && Object.keys(userParty).length <= 4) {
                columns = '6';
            } else if (wrapSprites && Object.keys(userParty).length > 4) {
                columns = '4';
            }
        }

        $.each(userParty, function (id, pokemon) {
            var sprite = $(`<img title="${pokemon.name} (${pokemon.species})" data-id=${id} data-species="${pokemon.species}" data-name="${pokemon.name}" src="${getPokemonSprite(pokemon.species).front}">`);
            sprite.addClass(classes);
            sprite.addClass("img-fluid");
            var spriteDiv = $(`<div class='justify-content-center col-${columns}'>`).append(sprite);

            spriteDiv.appendTo($(location));
        })

    }

    function loadUserInventory(location) {
        $(location).empty();

        if (!userInventory) {
            $(location).text("You currently have no Pokemon in your PC \xa0:(");
        }

        $.each(userInventory, function (id, pokemon) {
            $(`<img class="inventoryPokemon" data-id=${id} data-species="${pokemon.species}" data-name="${pokemon.name}" title="${pokemon.name} (${pokemon.species})" src="${getPokemonSprite(pokemon.species).icon}">`).appendTo($(location));
        })
    }

    function getCurrentTime() {
        return moment().format('LLLL');
    }

    function getPokemonSprite(pokemonName) {
        return {
            front: pokemonList[pokemonName.toLowerCase()].spriteFront,
            back: pokemonList[pokemonName.toLowerCase()].spriteBack,
            icon: pokemonList[pokemonName.toLowerCase()].icon
        };
    }

    function getTrainerSprite(trainer) {
        var sprite, icon;
        if (trainer === "male") {
            sprite = "assets/images/maleSprite.png";
            icon = "https://i.ibb.co/6cMNgPY/maleIcon.png";
        } else if (trainer === "female") {
            sprite = "assets/images/femaleSprite.png";
            icon = "https://i.ibb.co/8Xt4m42/female-Icon.png";
        }

        var request = {
            sprite: sprite,
            icon: icon
        }

        return request;
    }

    function addNewPokemon(destination, species, previewDiv) {
        var name = species;
        name = prompt("What would you like to name this Pokemon? ('.' and '/' are not allowed)", species);
        var destinationRef;

        if (destination === 'party') {
            // ADD ERROR CHECKING TO SEE IF PARTY ALREADY HAS SIX POKEMON
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
            $(previewDiv).html(`<img src=${getPokemonSprite(species).front}>`);
        }

    }

    function movePokemon(origin, id) {
        var oRef, dRef, tmp;

        if (origin === "party") {
            o = userParty;
            oRef = currentUserRef.child("pokemonParty");
            d = userInventory;
            dRef = currentUserRef.child("pokemonPC");

        } else if (origin === "pc") {
            o = userInventory;
            oRef = currentUserRef.child("pokemonPC");
            d = userParty;
            dRef = currentUserRef.child("pokemonParty");
        }
        // store pokemon to be moved in a temporary variable
        tmp = o[id];
        oRef.child(id).set(null);
        dRef.child(id).set(tmp);

    }

    function isPokemon(species) {
        return pokemonNamesList.indexOf(species) === -1
    }

    function loadPokemonInfoModal(origin, selectedPokemon) {
        $("#pokemonInfoTitle").text(selectedPokemon.attr("title"));
        $("#pokemonInfoPreview").html(
            `<img src="${getPokemonSprite(selectedPokemon.attr("data-species")).front}">`
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

    function loadLastUserLocation(divID) {
        initMap(divID);

        var marker = new google.maps.Marker({
            position: userLocation,
            title: currentUser,
            icon: getTrainerSprite(userTrainer).icon
        });

        // To add the marker to the map, call setMap();
        marker.setMap(map);
        map.setCenter(userLocation);

    }

    function setUserStartLocation() {
        // DEFAULT USER LOCATION (TOKYO, JAPAN)
        var userAccount = {
            userLocation: {
                lat: 35.6804,
                lng: 139.7690
            }
        };


        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                console.log(position);
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                userAccount.userLocation = pos;
                currentUserRef.set(userAccount);


            }, function () {
                handleLocationError(true, infoWindow, map.getCenter());
            });
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infoWindow, map.getCenter());
        }
        currentUserRef.set(userAccount);

    }

    function showFormattedAddress(coord) {
        // Using LocationIQ API

        var key = "e67dbc1c1f9456";
        var queryURL = `https://us1.locationiq.com/v1/reverse.php?key=${key}&lat=${coord.lat}&lon=${coord.lng}&format=json`;
        $.ajax({
            url: queryURL,
            method: "GET"
        }).then(function (result) {
            $("#formattedLastLocation").html(`You are currently at: <strong> ${result.display_name} </strong>`)
        });
        // Using Google Map Reverse Geocoding API
        // geocoder = new google.maps.Geocoder;

        // geocoder.geocode({
        //     'location': coord
        // }, function (results, status) {
        //     if (status === 'OK') {
        //         if (results[0]) {
        //             return results[0].formatted_address;
        //         } else {
        //             window.alert('No results found');
        //         }
        //     } else {
        //         window.alert('Geocoder failed due to: ' + status);
        //     }
        // });


    }

    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
        infoWindow.setPosition(pos);
        infoWindow.setContent(browserHasGeolocation ?
            'Error: The Geolocation service failed.' :
            'Error: Your browser doesn\'t support geolocation.');
        infoWindow.open(map);
    }

    function initMap(divID) {
        map = new google.maps.Map(document.getElementById(divID), {
            center: {
                lat: -25.363882,
                lng: 131.044922
            },
            zoom: 18,
            mapTypeId: 'satellite',
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: true,
            styles: [{
                "featureType": "administrative",
                "elementType": "labels.text.stroke",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "color": "#f1ffb8"
                }, {
                    "weight": "2.29"
                }]
            }, {
                "featureType": "administrative.land_parcel",
                "elementType": "all",
                "stylers": [{
                    "visibility": "on"
                }]
            }, {
                "featureType": "landscape.man_made",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#a1f199"
                }]
            }, {
                "featureType": "landscape.man_made",
                "elementType": "labels.text",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "hue": "#ff0000"
                }]
            }, {
                "featureType": "landscape.natural.landcover",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#37bda2"
                }]
            }, {
                "featureType": "landscape.natural.terrain",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#37bda2"
                }]
            }, {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "color": "#afa0a0"
                }]
            }, {
                "featureType": "poi",
                "elementType": "labels.text.stroke",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "color": "#f1ffb8"
                }]
            }, {
                "featureType": "poi.attraction",
                "elementType": "geometry.fill",
                "stylers": [{
                    "visibility": "on"
                }]
            }, {
                "featureType": "poi.business",
                "elementType": "all",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "poi.business",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#e4dfd9"
                }]
            }, {
                "featureType": "poi.business",
                "elementType": "labels.icon",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "poi.government",
                "elementType": "all",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "poi.medical",
                "elementType": "all",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "poi.park",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#37bda2"
                }]
            }, {
                "featureType": "poi.place_of_worship",
                "elementType": "all",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "poi.school",
                "elementType": "all",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "poi.sports_complex",
                "elementType": "all",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "road",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#84b09e"
                }]
            }, {
                "featureType": "road",
                "elementType": "geometry.stroke",
                "stylers": [{
                    "color": "#fafeb8"
                }, {
                    "weight": "1.25"
                }, {
                    "visibility": "on"
                }]
            }, {
                "featureType": "road",
                "elementType": "labels.text.stroke",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "color": "#f1ffb8"
                }]
            }, {
                "featureType": "road.highway",
                "elementType": "labels.icon",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "road.arterial",
                "elementType": "geometry.stroke",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "color": "#f1ffb8"
                }]
            }, {
                "featureType": "road.arterial",
                "elementType": "labels.text.stroke",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "color": "#f1ffb8"
                }]
            }, {
                "featureType": "road.local",
                "elementType": "geometry.stroke",
                "stylers": [{
                    "visibility": "on"
                }, {
                    "color": "#f1ffb8"
                }, {
                    "weight": "1.48"
                }]
            }, {
                "featureType": "road.local",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "transit",
                "elementType": "all",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "water",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#5ddad6"
                }]
            }]

        });

        map.setTilt(65);

        infoWindow = new google.maps.InfoWindow;

    }

    $(document).on("click", ".inventoryPokemon", function () {
        $("#viewPCstatsButton").show();
        $("#addToPartyButton").show();
        $(".inventoryPokemon").removeClass("selectedInventoryPokemon");
        $(this).addClass("selectedInventoryPokemon");

    })

    $(document).on("click", ".partyPokemon", function () {
        $("#viewPartyStatsButton").show();
        $("#addToPCbutton").show();
        $(".partyPokemon").removeClass("selectedPartyPokemon");
        $(this).addClass("selectedPartyPokemon");
        // loadPokemonInfoModal('party', $(this));
    })

    $("#viewPCstatsButton").click(function () {
        var selectedPokemon = $(".selectedInventoryPokemon");

        loadPokemonInfoModal('pc', selectedPokemon);

    })

    $("#viewPartyStatsButton").click(function () {
        var selectedPokemon = $(".selectedPartyPokemon");

        loadPokemonInfoModal('party', selectedPokemon);

    })

    $("#addToPartyButton").click(function () {
        loadUserParty("#pokemonPartyPCpreview", false, "partyPCpokemon");
        $("#pokemonPartyPCpreview").show();
        movePokemon('pc', $(".selectedInventoryPokemon").attr("data-id"));
        loadUserParty("#pokemonPartyPCpreview", false, "partyPCpokemon");
        $("#viewPCstatsButton").hide();
        $("#addToPartyButton").hide();


    })

    $("#addToPCbutton").click(function () {
        // Add confirmation modal
        movePokemon('party', $(".selectedPartyPokemon").attr("data-id"));
        $("#viewPartyStatsButton").hide();
        $("#addToPCbutton").hide();
    })

    $(".partyPCpokemon").click(function () {

    })

    $(".partyPokemon").click(function () {

    })

    $('#pokemonPC').on('hidden.bs.modal', function () {
        $("#viewPCstatsButton").hide();
        $("#addToPartyButton").hide();
        $("#pokemonPartyPCpreview").hide();

    });

    $('#pokemonParty').on('hidden.bs.modal', function () {
        $("#viewPartyStatsButton").hide();
        $("#addToPCbutton").hide();
    });

    $(".trainer").click(function () {
        $(".trainer").attr("id", "");
        $(this).attr("id", "selectedTrainer");

    })

    $("#viewPCbutton").click(function () {
        //Load user caught Pokemon
        currentUserRef.on("value", function (snapshot) {
            userInventory = snapshot.val().pokemonPC;
            loadUserInventory("#pokemonPCview");
        })

    })

    $("#viewPartyButton").click(function () {
        //Load user party Pokemon
        currentUserRef.on("value", function (snapshot) {
            userParty = snapshot.val().pokemonParty;
            loadUserParty("#pokemonPartyView", true, "partyPokemon");
        })

    })




    ///////////////////////////////////////////////////////////
    // MAIN FUNCTIONS
    ///////////////////////////////////////////////////////////

    function showTrainerDash() {
        $("#gameMenu").hide();
        $("#pokemonSelection").hide();
        $("#trainerDashboard").fadeIn();

        //Display user greeting
        $("#userGreeting").html(`Welcome back, &nbsp;${currentUser}`);

        //Display user current Pokemon party
        currentUserRef.on("value", function (snapshot) {
            userParty = snapshot.val().pokemonParty;
            userTrainer = snapshot.val().trainer;
            userLocation = snapshot.val().userLocation;
            // loadUserParty("#pokemonPartyPreview", true, "partyPokemon");
        })

        // $("#trainerPreview").html(`<img src=${getTrainerSprite(userTrainer).sprite}>`);
        loadLastUserLocation("lastLocationPreview");
        showFormattedAddress(userLocation)
    }

    // Checks if an account linked to the username exists
    $("#resumeGameButton").click(function () {
        var username = $("#username-input").val().trim();

        if (username === '') {
            $("#user-dne-error").html("Please enter your username!");
        }

        // verify username exists; if not, display error
        if (users.child(username).exists()) {
            //Save user name locally
            currentUser = username;
            currentUserRef = usersRef.child(currentUser);

            showTrainerDash();

        } else {
            $("#user-dne-error").html("User does not exist!<br>Please select a valid user or start a new game.");
        }
    })

    $("#newGameButton").click(function () {
        var restartGame = true;
        var newUsername = $("#username-input").val().trim();

        if (newUsername === '') {
            $("#user-dne-error").html("Please enter a username!");
        }

        if (users.child(newUsername).exists()) {
            restartGame = confirm(`An account with the username "${newUsername}" exists. Would you still like to start a new game?`);
        }

        if (restartGame) {
            currentUser = newUsername;

            // Set new user account in Firebase realtime database
            currentUserRef = usersRef.child(currentUser);
            setUserStartLocation();

            // Hide Menu and Show Pokemon Selection page
            $("#gameMenu").hide();
            shrinkLogo();
            $("#pokemonSelection").fadeIn();
        }

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

            $("#pokemonPreview").html(`<img src=${getPokemonSprite(speciesName).front}>`);
        }
    })

    $("#initializeUserButton").click(function () {
        var speciesName = $("#pokemonSelector").val();
        //  If pokemon does not exist...
        if (isPokemon(speciesName)) {
            $("#pokemon-dne-error").text("Please select an existing Pokemon.");
        }
        //  If pokemon does exist...
        else {
            $("#pokemon-dne-error").text("");

            // Check if a trainer has been selected
            if (!$("#selectedTrainer").length) {
                $("#pokemon-dne-error").text("Please select a trainer!");
            } else {
                $("#pokemon-dne-error").text("");
                var selectedTrainer = $("#selectedTrainer").attr("data-trainer");
                currentUserRef.update({
                    trainer: selectedTrainer
                })

                addNewPokemon('party', speciesName);

                showTrainerDash();

            }

        }



    })



})