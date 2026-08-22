import handler from "../api/index.js";

function invoke(url) {
  return new Promise((resolve) => {
    const headers = {};
    const response = {
      statusCode: 0,
      setHeader(name, value) { headers[name] = value; },
      end(body) { resolve({ statusCode: this.statusCode, headers, body: JSON.parse(body) }); },
    };
    handler({ url }, response);
  });
}

const films = await invoke("/api/trpc/filmGrab.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D");
const characters = await invoke("/api/trpc/characterPrompts.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D");
const cron = await invoke("/api/cron/film-grab");
if (films.statusCode !== 200 || films.body[0].result.data.json.length !== 60) throw new Error("Film Grab public API contract failed");
if (characters.statusCode !== 200 || characters.body[0].result.data.json.length !== 3) throw new Error("Character benchmark public API contract failed");
if (cron.statusCode !== 200 || cron.body.source !== "film-grab.com" || typeof cron.body.checkedAt !== "string") throw new Error("Film Grab cron contract failed");
console.log(`Public API contract passed: 60 films, 3 character benchmarks, cron status ${cron.body.sourceStatus}.`);
