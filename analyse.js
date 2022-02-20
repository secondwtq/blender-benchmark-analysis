
// developer.blender.org/source/blender-open-data/browse/search-input-overflow/website/opendata_main/schemas/benchmark-v3.json;launcher/2.0.5
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
    // Filter 2.79 results since they have an old data schema, and goes back to ZNVER1/CFL/Pascal era anyway
    const allData = Array.prototype.concat.apply([], dataArrays)
      .filter(item => !item.blender_version.version.match(/2\.79/));
    console.log(allData.length, allData[0]);
    callback(null, allData);
  });
}

function groupBy(data, f) {
  const group = data.map(f);
  const groupMap = new Map();
  group.forEach(n => {
    if (groupMap.has(n))
        groupMap.set(n, groupMap.get(n) + 1);
    else
        groupMap.set(n, 1);
  });
  return groupMap;
}

// There are entries with 1, 2, 4 devices
// The 4-device entries are all CPUs, but they're not multi-socket, even not multi-die ...
// The 2-device entries are all "AMD Radeon Pro WX 7100 Graphics", and seems to be all 2.79 ...
function analyseNumberOfDevices(data) {
    // data.forEach(item => {
    //     if (item.device_info.compute_devices.length == 2) {
    //         console.log(item.device_info.compute_devices);
    //         // console.log(item);
    //     }
    // });
  console.log(groupBy(data, item => item.device_info.compute_devices.length));
}

function groupMiscInfo(data) {
  console.log("Number of Devices", groupBy(data, item => item.device_info.compute_devices.length));
  console.log("Backend", groupBy(data, item => item.device_info.device_type));
  console.log("OS", groupBy(data, item => item.system_info.system));
  console.log("Distro", groupBy(data, item => item.system_info.dist_name));
  console.log("Arch", groupBy(data, item => item.system_info.machine));
  console.log("#Cores", groupBy(data, item => item.system_info.num_cpu_cores));
  console.log("Scene label", groupBy(data, item => { return item.scene.label}));
  console.log("Scene checksum", groupBy(data, item => item.scene.checksum));
  // Working: 2.93.1, 2.92.0, 2.91.2, 2.90.0, 2.83.0, 2.82 (sub 7), 2.81 (sub 7/16)
  // 2.79 (sub 0/1/2/6/7) is missing the label field
  console.log("Blender version label", groupBy(data, item => {
    return item.blender_version.label;
  }));
  console.log("Blender version version", groupBy(data, item => item.blender_version.version));
  console.log("Launcher version label", groupBy(data, item => {
    return item.benchmark_launcher.label;
  }));
  console.log("Script version label", groupBy(data, item => item.benchmark_script.label));
  console.log("Launcher version checksum", groupBy(data, item => item.benchmark_launcher.checksum));
  console.log("Script version checksum", groupBy(data, item => item.benchmark_script.checksum));
}

function cleanupData(data) {
  return data.flatMap(item => {
    const numberOfDevices = item.device_info.compute_devices.length;
    switch (numberOfDevices) {
      case 1: break;
      default: throw "Unexpected number of devices!";
      case 2: case 4: return [];
    }
    return {
      timestamp: item.timestamp,
      device: item.device_info.compute_devices[0].name,
      backend: item.device_info.device_type,
      scene: item.scene.label,
      time_nosync: item.stats.render_time_no_sync,
      time_total: item.stats.total_render_time,

      arch: item.system_info.machine,
      os: item.system_info.system,
      cpu_cores: item.system_info.num_cpu_cores,

      version_blender: item.blender_version.version,
      version_launcher: item.benchmark_launcher.label,
      version_script: item.benchmark_script.label,
    };
  });
}

findRawDataFile((err, filename) =>
  readRawData(filename, (err, data) => {
    groupMiscInfo(data);
    const out = cleanupData(data);
    fs.writeFileSync("data-inter/cleaned.json", JSON.stringify(out, null, "  "));
    // analyseNumberOfDevices(data);
  }));
