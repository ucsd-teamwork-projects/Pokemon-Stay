function initAutocomplete() {
    var map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: -33.8688,
            lng: 151.2195
        },
        zoom: 13,
        mapTypeId: 'roadmap',
        //gestureHandling: 'none',
        //zoomControl: false
    });


    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    var renderSpritesFlag = false;

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function () {
        searchBox.setBounds(map.getBounds());
        
        if(renderSpritesFlag === false){
            var newBounds = map.getBounds();
            console.log(newBounds.getNorthEast().lat())

            for(var x = 0; x < 10; ++x){
                var randCoord = GetRandCoords(newBounds.getSouthWest().lat(), newBounds.getNorthEast().lat(), newBounds.getSouthWest().lng(), newBounds.getNorthEast().lng());
                console.log(randCoord)


                var icon = {
                    url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/58.png",
                    size: new google.maps.Size(71, 71),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(17, 34),
                    scaledSize: new google.maps.Size(75, 75)
                };
                
                var marker = new google.maps.Marker({
                    map: map,
                    icon: icon,
                    title: "test",
                    position: new google.maps.LatLng(randCoord.latitude, randCoord.longitude)
                });

                marker.addListener("click", function(){
                    console.log("marker test")
                })
                //markers.push(marker);
                //marker.setMap(map);
            }

            renderSpritesFlag = true;

            console.log(markers[0])
        }
    });

   


    //var marker;
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
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25)
            };

            // Create a marker for each place.
            markers.push(new google.maps.Marker({
                map: map,
                icon: icon,
                title: place.name,
                position: place.geometry.location
            }));

            // google.maps.event.addListener(map, "bounds_changed", function () {
            //     var newBounds = map.getBounds();
            //     console.log(newBounds.getNorthEast().lat())

            //     var randCoord = GetRandCoords(newBounds.getSouthWest().lat(), newBounds.getNorthEast().lat(), newBounds.getSouthWest().lng(), newBounds.getNorthEast().lng());
            //     console.log(randCoord)

            //     markers.push(new google.maps.Marker({
            //         map: map,
            //         icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/58.png",
            //         title: "test",
            //         position: new google.maps.LatLng(randCoord.latitude, randCoord.longitude)
            //     }));
            // });


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