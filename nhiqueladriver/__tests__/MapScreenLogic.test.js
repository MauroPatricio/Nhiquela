describe('Pickup Location Extraction Logic', () => {
  const getPickupCoords = (storedTrip) => {
    // The exact logic from MapScreen.tsx line 135
    const vendorLat = Number(storedTrip.originalData?.originLocation?.latitude || storedTrip.originalData?.seller?.location?.lat || storedTrip.originalData?.seller?.latitude || storedTrip.originalData?.originDetails?.lat || storedTrip.originalData?.latitude);
    const vendorLng = Number(storedTrip.originalData?.originLocation?.longitude || storedTrip.originalData?.seller?.location?.lng || storedTrip.originalData?.seller?.longitude || storedTrip.originalData?.originDetails?.lng || storedTrip.originalData?.longitude);
    return { vendorLat, vendorLng };
  };

  it('should extract vendor location for a standard Product Order with seller.location', () => {
    const storedTrip = {
      stepStatus: 4,
      originalData: {
        seller: {
          location: { lat: -25.9692, lng: 32.5732 }
        },
        latitude: -25.0, // Client's destination (should be ignored)
        longitude: 32.0
      }
    };
    const { vendorLat, vendorLng } = getPickupCoords(storedTrip);
    expect(vendorLat).toBe(-25.9692);
    expect(vendorLng).toBe(32.5732);
  });

  it('should extract vendor location for a RequestService with originDetails', () => {
    const storedTrip = {
      stepStatus: 4,
      originalData: {
        originDetails: { lat: -25.8888, lng: 32.7777 },
        latitude: -25.0, // Client's destination fallback
        longitude: 32.0
      }
    };
    const { vendorLat, vendorLng } = getPickupCoords(storedTrip);
    expect(vendorLat).toBe(-25.8888);
    expect(vendorLng).toBe(32.7777);
  });

  it('should fallback to latitude/longitude if originDetails and seller are missing', () => {
    const storedTrip = {
      stepStatus: 4,
      originalData: {
        latitude: -25.5555,
        longitude: 32.5555
      }
    };
    const { vendorLat, vendorLng } = getPickupCoords(storedTrip);
    expect(vendorLat).toBe(-25.5555);
    expect(vendorLng).toBe(32.5555);
  });
});
