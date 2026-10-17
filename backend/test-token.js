const http = require("http");
const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET || "eldoria_super_secret_jwt_key_2026";

// Create client token for user 7
const clientToken = jwt.sign(
  {
    id: 7,
    phone: "9876543212",
    role: "client",
    name: "Client 3211",
  },
  jwtSecret,
  { expiresIn: "7d" }
);

function request(path, token) {
  return new Promise((resolve) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        method: "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.end();
  });
}

async function run() {
  console.log("=== 1. Test with client token and specific booking ELD-20448 ===");
  const res1 = await request("/api/v1/client/booking/ELD-20448/track", clientToken);
  console.log("Status:", res1.status, res1.body?.message || res1.body?.error);
  console.log("Code:", res1.body?.data?.code, "Booking status:", res1.body?.data?.status);

  console.log("\n=== 2. Test with client token and literal ':id' (as in Postman URL template) ===");
  const res2 = await request("/api/v1/client/booking/:id/track", clientToken);
  console.log("Status:", res2.status, res2.body?.message || res2.body?.error);
  console.log("Code:", res2.body?.data?.code, "Booking status:", res2.body?.data?.status);

  console.log("\n=== 3. Test with client token on /booking/track (without :id) ===");
  const res3 = await request("/api/v1/client/booking/track", clientToken);
  console.log("Status:", res3.status, res3.body?.message || res3.body?.error);
  console.log("Code:", res3.body?.data?.code, "Booking status:", res3.body?.data?.status);
}

run().catch(console.error);
