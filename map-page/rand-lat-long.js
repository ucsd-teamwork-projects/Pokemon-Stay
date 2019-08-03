
function getRandomInRange(from, to, fixed) {
    return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
}

functionGetRandCoords(minLat, maxLat, minLong, maxLong){
    var lat = getRandomInRange(minLat, maxLat, 3);
    var long = getRandomInRange(minLong, maxLong, 3);
    var randCoordinates = {latitude: lat, longitude: long};
    return randCoordinates;
}