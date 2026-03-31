async function test() {
  try {
    const res = await fetch('https://floodleveliot-be.onrender.com/api/Maps/search-map?Query=Điện Biên Phủ');
    const data = await res.json();
    console.log("Search map result:");
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();
