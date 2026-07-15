describe('Vehicle Bearing Logic', () => {
  const getBearing = (startLat, startLng, destLat, destLng) => {
    const toRad = deg => (deg * Math.PI) / 180;
    const toDeg = rad => (rad * 180) / Math.PI;

    const startLatRad = toRad(startLat);
    const startLngRad = toRad(startLng);
    const destLatRad = toRad(destLat);
    const destLngRad = toRad(destLng);

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
              Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

    const bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  };

  it('should return approx 0 for true North', () => {
    const bearing = getBearing(0, 0, 10, 0); // Moving straight North
    expect(bearing).toBeCloseTo(0, 0);
  });

  it('should return approx 90 for true East', () => {
    const bearing = getBearing(0, 0, 0, 10); // Moving straight East
    expect(bearing).toBeCloseTo(90, 0);
  });

  it('should return approx 180 for true South', () => {
    const bearing = getBearing(10, 0, 0, 0); // Moving straight South
    expect(bearing).toBeCloseTo(180, 0);
  });

  it('should return approx 270 for true West', () => {
    const bearing = getBearing(0, 10, 0, 0); // Moving straight West
    expect(bearing).toBeCloseTo(270, 0);
  });

  it('should calculate Northeast heading correctly', () => {
    const bearing = getBearing(0, 0, 10, 10);
    expect(bearing).toBeGreaterThan(0);
    expect(bearing).toBeLessThan(90);
  });
});
