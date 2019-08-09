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

    var isGameOver = false;
    var mapInitiated = false;
    var gameSpeed = 1.5;

    var userBattleObject = {
        id: "",
        name: "",
        species: "",
        nameDiv: "#userName",
        healthID: "#userHealth",
        divID: "#userPokemon",
        health: 100,
        damage: 25,
        isFacing: false
    }

    var enemyBattleObject = {
        name: "",
        nameDiv: "#enemyName",
        healthID: "#enemyHealth",
        divID: "#enemyPokemon",
        health: 100,
        damage: 10,
    }

    var currEnemyMarker;

    //MUSIC & SOUNDS
    var mainTheme = new Audio('./assets/sounds/opening.mp3');
    var battleTheme = new Audio('./assets/sounds/battle.mp3');
    var victoryTheme = new Audio('./assets/sounds/victory.mp3');
    var defeatTheme = new Audio('./assets/sounds/defeat.mp3')
    var clickSound = new Audio('./assets/sounds/click.mp3');
    var faintSound = new Audio('./assets/sounds/faint.mp3');
    var hitSound = new Audio('./assets/sounds/hit.mp3');
    var lowHealthSound = new Audio('./assets/sounds/lowHealth.mp3');
    // var levelUpSound = new Audio('./assets/sounds/levelUp.mp3');


    ///////////////////////////////////////////////////////////
    // PERFORM ON PAGE LOAD
    ///////////////////////////////////////////////////////////

    // PLAY OPENING MUSIC
    playLoop(mainTheme);

    // Load game info if not already loaded in local storage
    if (!localStorage.getItem("pokemonList") && !localStorage.getItem("pokemonNamesList")) {
        // LOAD ALL POKEMON INFO (NAMES, SPRITES, MOVES, TYPES)
        var queryURL = `https://pokeapi.co/api/v2/pokemon-species?limit=649`;
        $.ajax({
            url: queryURL,
            method: "GET"
        }).then(function (listOfPokemonSpecies) {
            $.each(listOfPokemonSpecies.results, function (idx, pokemonSpecies) {

                queryURL = `https://pokeapi.co/api/v2/pokemon/${idx+1}`;

                $.ajax({
                    url: queryURL,
                    method: "GET"

                }).then(function (pokemonInfo) {
                    // Check if all pokemon have been loaded
                    if (pokemonNamesList.length === 648) {
                        localStorage.setItem("pokemonList", JSON.stringify(pokemonList));
                        localStorage.setItem("pokemonNamesList", JSON.stringify(pokemonNamesList));
                        $("#loading").hide();
                        $("#gameDisplay").fadeIn();
                    }

                    // If the sprites exist, add pokemon to the list
                    if (pokemonInfo.sprites.front_default && pokemonInfo.sprites.back_default) {
                        var capitalizedName = pokemonInfo.name.charAt(0).toUpperCase() + pokemonInfo.name.slice(1);
                        pokemonNamesList.push(capitalizedName);

                        // if (pokemonInfo.stats[4].base_stat)

                        pokemonList[pokemonInfo.name] = {
                            spriteFront: pokemonInfo.sprites.front_default,
                            spriteBack: pokemonInfo.sprites.back_default,
                            icon: `https://img.pokemondb.net/sprites/sun-moon/icon/${pokemonInfo.name}.png`
                            // baseAttack: pokemonInfo.stats[4].base_stat,
                            // baseSpeed: pokemonInfo.stats[0].base_stat,
                            // baseHP: pokemonInfo.stats[5].base_stat,
                            // pokedexEntry: pokemonSpeciesInfo.flavor_text_entries[2].flavor_text
                            // pokedexNumber: pokemonSpeciesInfo.pokedex_numbers[4].entry_number
                            // types: types
                            // moves: moves
                        }
                    }
                });



            })

        })
    } else {
        pokemonList = JSON.parse(localStorage.getItem("pokemonList"));
        pokemonNamesList = JSON.parse(localStorage.getItem("pokemonNamesList"));
        $("#loading").hide();
        $("#gameDisplay").fadeIn();
    }

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

    function playLoop(sound) {
        // LOWER VOLUME FOR BACKGROUND MUSIC
        if (sound === lowHealthSound) {
            sound.volume = 0.1;
        } else {
            sound.volume = 0.05;
        }
        sound.loop = true;
        sound.play();
    }

    function pause(sound) {
        sound.loop = false;
        sound.pause();
    }

    // FUNCTION TO AUTOCOMPLETE STARTER POKEMON CHOOSER
    $(function () {
        // USE JQUERY UI TO AUTOCOMPLETE FORM 
        $("#pokemonSelector").autocomplete({
            source: pokemonNamesList
        });

    });

    function shrinkLogo(percent) {
        $("#gameLogo").animate({
            "width": `${percent}%`
        });
    }

    function loadUserParty(location, wrapSprites, classes) {
        $(location).empty();
        getUserInfo();

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
        getUserInfo();
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
            styles: mapStyles

        });

        map.setTilt(65);

        infoWindow = new google.maps.InfoWindow;

    }

    // PUTS GIVEN POKEMON ON STAGE
    function presentPokemon(pokemon) {
        var pokemonElement;
        var spriteType;
        if (pokemon === enemyBattleObject) {
            spriteType = 'front';
        } else {
            spriteType = 'back';
        }

        // Reset health bars
        updateHealth(pokemon, 0);

        // Remove any existing sprite
        $(pokemon.divID).fadeOut();
        $(pokemon.divID).remove();
        pokemonElement = $(`<img id=${(pokemon.divID).split('#')[1]} class='justify-content-center w3-animate-opacity'>`);
        if (pokemon === userBattleObject) {
            $('#battleArena').append(pokemonElement.attr("src", getPokemonSprite(pokemon.species)[spriteType]));
        } else {
            $('#battleArena').append(pokemonElement.attr("src", getPokemonSprite(pokemon.name)[spriteType]));

        }
        $(pokemon.nameDiv).text(pokemon.name);

    }

    // UPDATE GAME MESSAGE
    function updateMessage(msg) {
        $("#gameMessage").empty();
        $("#gameMessage").append($("<p>").html(msg));
    }


    $(document).on("click", ".inventoryPokemon", function () {
        clickSound.play();
        $("#viewPCstatsButton").show();
        $("#addToPartyButton").show();
        $(".inventoryPokemon").removeClass("selectedInventoryPokemon");
        $(this).addClass("selectedInventoryPokemon");

    })

    $(document).on("click", ".partyPokemon", function () {
        clickSound.play();
        $("#viewPartyStatsButton").show();
        $("#addToPCbutton").show();
        $(".partyPokemon").removeClass("selectedPartyPokemon");
        $(this).addClass("selectedPartyPokemon");
        // loadPokemonInfoModal('party', $(this));
    })

    $("#viewPCstatsButton").click(function () {
        clickSound.play();
        var selectedPokemon = $(".selectedInventoryPokemon");
        loadPokemonInfoModal('pc', selectedPokemon);

    })

    $("#viewPartyStatsButton").click(function () {
        clickSound.play();
        var selectedPokemon = $(".selectedPartyPokemon");
        loadPokemonInfoModal('party', selectedPokemon);

    })

    $("#addToPartyButton").click(function () {
        clickSound.play();
        movePokemon('pc', $(".selectedInventoryPokemon").attr("data-id"));
        loadUserParty("#pokemonPartyPCpreview", true, "partyPCPokemon");
        loadUserInventory("#pokemonPCview", true, "partyPCPokemon");

        $("#pokemonPartyPCpreview").show();
        $("#viewPCstatsButton").hide();
        $("#addToPartyButton").hide();


    })

    $("#addToPCbutton").click(function () {
        clickSound.play();
        // Add confirmation modal
        movePokemon('party', $(".selectedPartyPokemon").attr("data-id"));
        loadUserParty("#pokemonPartyView", true, "partyPokemon");
        $("#viewPartyStatsButton").hide();
        $("#addToPCbutton").hide();
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
        clickSound.play();
        $(".trainer").attr("id", "");
        $(this).attr("id", "selectedTrainer");

    })

    $("#viewPCbutton").click(function () {
        clickSound.play();
        //Load user caught Pokemon
        getUserInfo();
        loadUserInventory("#pokemonPCview");


    })

    function getUserInfo() {
        //Load user Pokemon
        currentUserRef.on("value", function (snapshot) {
            userParty = snapshot.val().pokemonParty;
            userInventory = snapshot.val().pokemonPC;
        })
    }

    $(".viewPartyButton").click(function () {
        clickSound.play();

        if ($(this).attr("id") == "switchButton") {
            loadUserParty("#pokemonPartyView", true, "switchPartyPokemon");
            markActivePokemon();

        } else {
            loadUserParty("#pokemonPartyView", true, "partyPokemon");
        }

    })

    $(document).on("click", ".switchPartyPokemon", function () {
        clickSound.play();
        // If the pokemon selected isn't the current pokemon in battle
        if ($(this).attr("data-id") !== userBattleObject.id) {
            var species = $(this).attr("data-species");
            var name = $(this).attr("data-name");
            var id = $(this).attr("data-id");

            $('#pokemonParty').modal('hide')
            updateMessage(`You have chosen to send ${bold(name)} into battle!`);

            setTimeout(function () {
                userBattleObject.id = id;
                userBattleObject.name = name;
                userBattleObject.species = species;
                userBattleObject.health = 100;
                presentPokemon(userBattleObject);
                enemyTurn();
            })
        }
    })


    $("#viewDashButton").click(function () {
        clickSound.play();
        showTrainerDash();
    })

    function getRandomSprite() {
        var randomIndex = Math.floor(Math.random() * pokemonNamesList.length);
        var randomPokemon = pokemonNamesList[randomIndex];
        var randomPokemonFormatted = randomPokemon.toLowerCase();
        return {
            front: pokemonList[randomPokemonFormatted].spriteFront,
            back: pokemonList[randomPokemonFormatted].spriteBack,
            icon: pokemonList[randomPokemonFormatted].icon,
            name: randomPokemon
        }


    };

    function placeUserMarker(map) {
        // Place user marker
        var userMarker = new google.maps.Marker({
            position: userLocation,
            title: currentUser,
            icon: getTrainerSprite(userTrainer).icon
        });

        // To add the marker to the map, call setMap();
        userMarker.setMap(map);

    }

    function setNewUserLocation(coord) {

        currentUserRef.update({
            userLocation: coord
        });

        userLocation = coord;

    }

    function renderExploreMap(location) {
        var map = new google.maps.Map(document.getElementById('exploreMap'), {
            center: {
                lat: userLocation.lat,
                lng: userLocation.lng
            },
            zoom: 15,
            mapTypeId: 'roadmap',
            mapTypeControl: false,
            zoomControl: true,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: true,
            styles: mapStyles
            // gestureHandling: 'none',
            // zoomControl: false
        });

        // Place user marker
        placeUserMarker(map);

        // Create the search box and link it to the UI element.
        var input = document.getElementById('pac-input');
        var searchBox = new google.maps.places.SearchBox(input);
        var renderSpritesFlag = false;

        map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function () {
            searchBox.setBounds(map.getBounds());

            if (renderSpritesFlag === false) {
                // set new user location 
                var c = map.getCenter();
                var center = {
                    lat: c.lat(),
                    lng: c.lng()
                }
                setNewUserLocation(center);
                placeUserMarker(map)

                var newBounds = map.getBounds();

                for (var x = 0; x < 10; ++x) {
                    var randCoord = GetRandCoords(newBounds.getSouthWest().lat(), newBounds.getNorthEast().lat(), newBounds.getSouthWest().lng(), newBounds.getNorthEast().lng());

                    var randomPokemon = getRandomSprite()
                    var icon = {
                        url: randomPokemon.front
                        // size: new google.maps.Size(71, 71),
                        // origin: new google.maps.Point(0, 0),
                        // anchor: new google.maps.Point(17, 34),
                        // scaledSize: new google.maps.Size(75, 75)
                    };

                    var marker = new google.maps.Marker({
                        map: map,
                        icon: icon,
                        title: randomPokemon.name,
                        position: new google.maps.LatLng(randCoord.latitude, randCoord.longitude)
                    });

                    marker.addListener("click", function () {
                        currEnemyMarker = this;
                        if (userParty) {
                            renderBattle();
                        } else {
                            alert("Please have at least one Pokemon in your party!");
                        }
                    })

                }
                renderSpritesFlag = true;

            }
        });

        var markers = [];
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.

        searchBox.addListener('places_changed', function () {
            renderSpritesFlag = false;
            var places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // Clear out the old markers.
            markers.forEach(function (marker) {
                marker.setMap(null);
            });
            markers = [];

            // For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();

            places.forEach(function (place) {
                if (!place.geometry) {
                    console.log("Returned place contains no geometry");
                    return;
                }
                var icon = {
                    url: place.icon,
                    // size: new google.maps.Size(71, 71),
                    // origin: new google.maps.Point(0, 0),
                    // anchor: new google.maps.Point(17, 34),
                    // scaledSize: new google.maps.Size(25, 25)
                };

                // Create a marker for each place.
                markers.push(new google.maps.Marker({
                    map: map,
                    icon: icon,
                    title: place.name,
                    position: place.geometry.location
                }));

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
        });
    }

    function getPartyPokemon(index) {
        var key = Object.keys(userParty)[index];
        if (key) {
            return userParty[key];
        }
    }

    // RETURN THE HTML TO BOLD A GIVEN MESSAGE
    function bold(msg) {
        return `<strong>${msg}</strong>`
    }

    // UPDATES HEALTH BAR VISUALS AND CHECKS USER/ENEMY FAINT STATUS
    function updateHealth(pokemon, damageDealt) {

        // SHAKE CURRENT POKEMON
        // shake(pokemon.divID);

        pokemon.health = pokemon.health - damageDealt;
        if (pokemon.health < 0) {
            pokemon.health = 0;
        }

        if (pokemon.health > 0) {
            $(pokemon.healthID).attr("aria-valuenow", pokemon.health);
            $(pokemon.healthID).css("width", `${pokemon.health}%`);
            updateColor(pokemon.health);

        } else {
            faint(pokemon);
        }

        function updateColor() {
            if (pokemon.health > 50) {
                $(pokemon.healthID).removeClass("bg-warning");
                $(pokemon.healthID).removeClass("bg-danger");
                $(pokemon.healthID).addClass("bg-success");
            } else if (pokemon.health <= 50 && pokemon.health > 20) {
                $(pokemon.healthID).removeClass("bg-success");
                $(pokemon.healthID).addClass("bg-warning");

            } else if (pokemon.health <= 20 && pokemon.health > 0) {
                $(pokemon.healthID).removeClass("bg-warning");
                $(pokemon.healthID).addClass("bg-danger");
                playLoop(lowHealthSound);
            }

        }

        function faint(pokemon) {
            // PAUSE ALL PLAYING MUSIC
            pause(lowHealthSound);
            // UPDATE HEALTH BAR AND PLAY SOUND
            $(pokemon.healthID).attr("aria-valuenow", pokemon.health);
            $(pokemon.healthID).css("width", `${pokemon.health}%`);
            updateColor();
            faintSound.play();

            $(pokemon.divID).fadeOut();
            $(pokemon.divID).remove();

            // UPDATE MESSAGE
            if (pokemon === userBattleObject) {
                updateMessage(`${bold(pokemon.name)} has fainted!`);
                userDefeat()
            } else {
                updateMessage(`${bold(pokemon.name)} has fainted! ${bold(pokemon.name)} has been added to your PC.`);
                userVictory();
            }

        }


    }

    // DISPLAYS VICTORY MESSAGE IF ALL ENEMIES DEFEATED, OTHERWISE PROMPTS NEXT 
    function userVictory() {
        pause(battleTheme);
        playLoop(victoryTheme);
        setTimeout(function () {
            isGameOver = true;
            addNewPokemon('pc', currEnemyMarker.title);
            currEnemyMarker.setMap(null);
            $("#gameView").hide()
            $("#exploreMapPage").fadeIn()
            pause(victoryTheme);
        }, 2500 / gameSpeed);


    }

    // DISPLAYS LOSS MESSAGE AND PROMPT USER POKEMON SWITCH
    function userDefeat() {
        isGameOver = true;
        updateMessage("You have been defeated!");
        pause(battleTheme);
        playLoop(defeatTheme);
        // promptSwitch();

    }

    function markActivePokemon() {
        $(`.switchPartyPokemon[data-id=${userBattleObject.id}]`).addClass("selectedPartyPokemon")
    }

    ///////////////////////////////////////////////////////////
    // MAIN FUNCTIONS
    ///////////////////////////////////////////////////////////

    function showTrainerDash() {
        shrinkLogo(40);
        $("#gameMenu").hide();
        $("#pokemonSelection").hide();
        $("#exploreMapPage").hide();
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

    function renderBattle() {
        // PAUSE THEME MUSIC AND PLAY BATTLE THEME
        pause(mainTheme);
        playLoop(battleTheme);
        isGameOver = false;

        // Render Enemy Pokemon Info

        enemyBattleObject.name = currEnemyMarker.title;
        enemyBattleObject.health = 100;
        // enemyBattleObject.damage = pokemonList[enemyBattleObject.name].baseAttack;

        presentPokemon(enemyBattleObject);

        // Render User Pokemon info
        userBattleObject.species = getPartyPokemon(0).species;
        userBattleObject.name = getPartyPokemon(0).name;
        userBattleObject.id = getPartyPokemon(0).ID;

        userBattleObject.health = 100;



        presentPokemon(userBattleObject);

        updateMessage(`A wild ${bold(enemyBattleObject.name)} has appeared!\xa0\xa0What would you like to do?`);
        enableButtons();

        $("#exploreMapPage").hide();
        $("#gameView").fadeIn();
    }


    function disableButtons() {
        $("#attackButton").attr("disabled", true);
        $("#fleeButton").attr("disabled", true);
        $("#switchButton").attr("disabled", true);

    }

    function enableButtons() {
        $("#attackButton").attr("disabled", false);
        $("#fleeButton").attr("disabled", false);
        $("#switchButton").attr("disabled", false);
    }

    function enemyTurn() {
        setTimeout(function () {
            if (enemyBattleObject.health > 0) {
                var attackMessage = `${bold(enemyBattleObject.name)} dealt ${enemyBattleObject.damage} damage!`;
                updateMessage(attackMessage);
                hitSound.play();
                updateHealth(userBattleObject, enemyBattleObject.damage);

                if (!isGameOver) {
                    setTimeout(function () {
                        updateMessage("Choose your next move!");
                        enableButtons();



                    }, 2500 / gameSpeed);
                }
            }
        }, 2500 / gameSpeed)

    }

    // ATTACKS ENEMY IF ON STAGE
    $('#attackButton').click(function () {
        if (!isGameOver) {
            // PLAY ATTACK SOUND AND SHOW MESSAGE
            var attackMessage = `${bold(userBattleObject.name)} dealt ${userBattleObject.damage} damage!`;
            updateMessage(attackMessage);
            hitSound.play();
            // UPDATE ENEMY HEALTH BAR (AND DETERMINE WHETHER 
            // OR NOT A NEW POKEMON IS NOW ON THE STAGE)
            var isNewPokemon = updateHealth(enemyBattleObject, userBattleObject.damage);
            // DISABLE ATTACK BUTTON
            if (!isGameOver) {
                disableButtons();
            }
            // COMMENCE ENEMY TURN
            (!isNewPokemon) ? enemyTurn(): '';
        }

    })

    $("#fleeButton").click(function () {
        updateMessage("You have fled!");
        setTimeout(function () {
            $("#gameView").hide();
            $("#exploreMapPage").fadeIn();
        }, 2500 / gameSpeed)
    })

    // Checks if an account linked to the username exists
    $("#resumeGameButton").click(function () {
        clickSound.play();
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
        clickSound.play();
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
            shrinkLogo(40);
            $("#pokemonSelection").fadeIn();
        }

    })

    $("#selectStarterButton").click(function () {
        clickSound.play();
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
        clickSound.play();
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

    $("#startButton").click(function () {
        if (!mapInitiated) {
            clickSound.play();
            renderExploreMap(userLocation);
            shrinkLogo(30);
            $("#trainerDashboard").hide();
            $("#exploreMapPage").fadeIn();
            mapInitiated = true;
        } else {
            shrinkLogo(30);
            $("#trainerDashboard").hide();
            $("#exploreMapPage").fadeIn();
        }
    })

})