function toRadians(degrees) {
    return degrees * Math.PI / 180;
}
const apiKey = "AIzaSyAYgK10l_C_HG-pSeVBVUxChyGSm6wa78Q";

function calculateDistance(coords1, coords2) {
    const R = 6371e3; // Earth's radius in meters
    const lat1Radians = toRadians(coords1.latitude);
    const lat2Radians = toRadians(coords2.latitude);
    const latDifference = toRadians(coords2.latitude - coords1.latitude);
    const lonDifference = toRadians(coords2.longitude - coords1.longitude);

    const a = Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
        Math.cos(lat1Radians) * Math.cos(lat2Radians) *
        Math.sin(lonDifference / 2) * Math.sin(lonDifference / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceInKilometers = (R * c) / 1000; // Distance in kilometers
    return distanceInKilometers.toFixed(2); // Format to two decimal places
}

function calculateTravelTime(distance, averageSpeed) {
    return distance / averageSpeed;
}


export { calculateDistance, calculateTravelTime, apiKey };