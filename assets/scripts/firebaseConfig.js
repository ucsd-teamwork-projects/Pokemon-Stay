// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyAz4ra0lsvD9q5DYmEdq55u07lDT80EE2w",
  authDomain: "pokemonstay-d7434.firebaseapp.com",
  databaseURL: "https://pokemonstay-d7434.firebaseio.com",
  projectId: "pokemonstay-d7434",
  storageBucket: "",
  messagingSenderId: "697569085638",
  appId: "1:697569085638:web:b5027014f7eef678"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create a variable to reference the database.
var database = firebase.database();