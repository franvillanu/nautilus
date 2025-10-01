// Netlify Edge Function for shared persistence using Netlify Blobs
// Path mapping is defined in netlify.toml as:
// [[edge_functions]]
//   path = "/api/*"
//   function = "blobs"

const KEY = "nautilus-data";

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        },
    });
}

export default async (request, context) => {
    try {
        const url = new URL(request.url);
        const path = url.pathname;

        // Only handle /api/tasks
        if (!path.startsWith("/api/")) {
            return new Response("Not found", { status: 404 });
        }
        if (path !== "/api/tasks") {
            return new Response("Not found", { status: 404 });
        }

        // Preflight, just in case
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        // GET returns the whole dataset
        if (request.method === "GET") {
            const data = await context.blobs.get(KEY);
            const payload =
                data && typeof data === "object"
                    ? data
                    : {
                          projects: [],
                          tasks: [],
                          projectCounter: 1,
                          taskCounter: 1,
                      };
            return jsonResponse(payload, 200);
        }

        // POST or PUT replaces the whole dataset
        if (request.method === "POST" || request.method === "PUT") {
            const body = await request.json().catch(() => null);
            if (!body || typeof body !== "object") {
                return jsonResponse({ error: "Invalid JSON body" }, 400);
            }

            const safe = {
                projects: Array.isArray(body.projects) ? body.projects : [],
                tasks: Array.isArray(body.tasks) ? body.tasks : [],
                projectCounter: Number.isFinite(Number(body.projectCounter))
                    ? Number(body.projectCounter)
                    : 1,
                taskCounter: Number.isFinite(Number(body.taskCounter))
                    ? Number(body.taskCounter)
                    : 1,
            };

            await context.blobs.set(KEY, safe);
            return jsonResponse({ ok: true }, 200);
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (err) {
        return jsonResponse(
            { error: "Server error", detail: String(err) },
            500
        );
    }
};
