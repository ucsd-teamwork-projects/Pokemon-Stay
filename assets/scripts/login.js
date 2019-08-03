const fb = require('./firebaseConfig.js');

var users = {};
var usersRef = fb.database.ref().child("users");

// Load user array on change (ie. new users were added)
usersRef.on("change", function (snapshot) {
    users = snapshot.val();
    console.log(users);
})

// Checks if an account linked to the username exists
$("#resumeGameButton").click(function () {

})

$("#newGameButton").click(function () {
    var newUsername = $("#username-input").val();

    var userAccount = {
        pokemonParty: ["pikachu"],
        pokemonInventory: ["snorlax"],
        userLocation: 'San Diego'
    };

    usersRef.put(newUsername, userAccount);

})