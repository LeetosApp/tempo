
const Docker = require("dockerode");
const express = require("express");
const bodyParser = require("body-parser");
const PORT = 3000;

const app = express();

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use(bodyParser.json());
app.listen(PORT, () => {
  console.log(`listening to port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("cpp-ally node-be is running ð¥³");
});

function createCommand(code) {
  let command = "";

  // const code =
  //   '#include <iostream>\nusing namespace std;\nint main() {\n cout << "Hello World!";\n return 0;\n }';
  const formattedCode = code.replace(/"/g, '\\"');

  command += `echo "${formattedCode}" > main.cpp && `;
  command += `g++ main.cpp && ./a.out`;

  return command;
}

async function runCode(res, code) {
  const config = {
    StdinOpen: false,
    BlkioWeight: 100,
    CpuPeriod: 500000,
    CpuQuota: 100000,
    CpuRtPeriod: 10000000,
    CpuShares: 2,
    Memory: "200m",
    WorkingDir: "/app",
    NetworkDisabled: true,
    AutoRemove: false,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    CapDrop: ["ALL"],
    PidsLimit: 20,
    SecurityOpt: ["no-new-privileges"],
    LogConfig: {
      Type: "json-file",
      Config: {
        MaxSize: "10m",
        MaxFile: "3",
      },
    },
    RestartPolicy: {
      Name: "no",
      MaximumRetryCount: 0,
    },
    Ulimits: [
      { Name: "cpu", Soft: 2, Hard: 2 },
      { Name: "fsize", Soft: 1024 * 1024 * 10, Hard: 1024 * 1024 * 10 },
      { Name: "memlock", Soft: 1024, Hard: 2048 },
      { Name: "nofile", Soft: 1024, Hard: 2048 },
      { Name: "nproc", Soft: 2, Hard: 2 },
    ],
  };
  let logs = "";

  const command = createCommand(code);

  const docker = new Docker();

  const container = await docker.createContainer({
    Image: "tenortypos/apiserver",
    Cmd: ["/bin/bash", "-c", command],
    ...config,
  });

  await container.start(async function (err, data) {
    if (err) {
      console.log(err);
    } else {
      container.logs(
        { follow: true, stdout: true, stderr: true },
        function (err, stream) {
          if (err) {
            console.error("Error fetching logs:", err);
            res.send({
              status: false,
              output: "Something went wrong",
            });
            return;
          }
          stream.setEncoding("utf8");
          stream.on("data", function (chunk) {
            logs += chunk.replace(/[^\x20-\x7E]/g, "");
          });
          stream.on("end", function () {
            console.log(logs);
            res.send({
              status: true,
              output: logs,
            });
          });
        }
      );
    }
  });
}

app.post("/run-code", async (req, res) => {
  const code = Buffer.from(req.body.code, "base64").toString("binary");
  await runCode(res, code);
});
