async function testRoute() {
  const payload = {
    StartAddress: "Đường điện biên phủ",
    StartLat: 10.7925,
    StartLng: 106.6917,
    EndAddress: "Phường Cầu Ông Lãnh",
    EndLat: 10.7630,
    EndLng: 106.6955,
    TravelMode: "Driving"
  };

  try {
    const res = await fetch('https://floodleveliot-be.onrender.com/api/Maps/route-avoid-flood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("Error:", err);
  }
}
testRoute();
