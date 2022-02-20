
const fs = require("fs");
const readline = require("readline");

function findRawDataFile(callback) {
    fs.readdir("rawdata", (err, items) => {
        callback(null, "rawdata/" + items.filter(item => item.match(/.*\.jsonl/))[0]);
    });
}

function readRawData(dataFilename, callback) {
    const lineReader = readline.createInterface({
        input: fs.createReadStream(dataFilename),
        crlfDelay: Infinity,
    });

    const dataArrays = [];
    console.log("Reading raw data");
    lineReader.on("line", (line) => {
        const data = JSON.parse(line);
        dataArrays.push(data.data);
    });

    lineReader.on("close", () => {
        console.log("Concatenating raw data");
        const allData = Array.prototype.concat.apply([], dataArrays);
        console.log(allData.length, allData[0]);
        callback(null, allData);
    });
}

// There are entries with 1, 2, 4 devices
// The 4-device entries are all CPUs, but they're not multi-socket, even not multi-die ...
// The 2-device entries are all "AMD Radeon Pro WX 7100 Graphics"
function analyseNumberOfDevices(data) {
    data.forEach(item => {
        if (item.device_info.compute_devices.length == 2) {
            console.log(item.device_info.compute_devices);
            // console.log(item);
        }
    });
    const nDevices = data.map(item => item.device_info.compute_devices.length);
    const nDevicesMap = new Map();
    nDevices.forEach(n => {
        if (nDevicesMap.has(n))
            nDevicesMap.set(n, nDevicesMap.get(n) + 1);
        else
            nDevicesMap.set(n, 1);
    });
    console.log(nDevicesMap);
}

findRawDataFile((err, filename) =>
    readRawData(filename, (err, data) => {
        analyseNumberOfDevices(data);
    }));

