export default {
    async fetch(request) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        };

        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: corsHeaders
            });
        }

        const dsatUrl = "https://www.dsat.gov.mo/dsat/carpark_detail.aspx?id=6025";

        try {
            const response = await fetch(dsatUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "zh-HK,zh-TW;q=0.9,en;q=0.8",
                    "Cache-Control": "no-cache"
                }
            });

            if (!response.ok) {
                throw new Error(`DSAT 回應錯誤：HTTP ${response.status}`);
            }

            const html = await response.text();

            const text = html
                .replace(/<script[\s\S]*?<\/script>/gi, " ")
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&#x2F;/g, "/")
                .replace(/&#47;/g, "/")
                .replace(/\s+/g, " ")
                .trim();

            const timestampMatch = text.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/);
            const updatedAt = timestampMatch ? timestampMatch[0] : null;

            const fractionMatches = [...text.matchAll(/(\d+|-)\s*\/\s*(\d+|-)/g)]
                .map(match => ({
                    availableText: match[1],
                    totalText: match[2],
                    available: match[1] === "-" ? null : Number(match[1]),
                    total: match[2] === "-" ? null : Number(match[2]),
                    display: `${match[1]} / ${match[2]}`
                }));

            if (fractionMatches.length < 5) {
                throw new Error("未能解析足夠的車位資料");
            }

            const result = {
                name: "望賢樓",
                source: dsatUrl,
                updatedAt,
                spaces: {
                    car: {
                        label: "輕型車",
                        ...fractionMatches[0]
                    },
                    motor: {
                        label: "電單車",
                        ...fractionMatches[1]
                    },
                    ecar: {
                        label: "電動車",
                        ...fractionMatches[2]
                    },
                    emotor: {
                        label: "電動電單車",
                        ...fractionMatches[3]
                    },
                    disabled: {
                        label: "無障礙車位",
                        ...fractionMatches[4]
                    }
                },
                fetchedAt: new Date().toISOString()
            };

            return new Response(JSON.stringify(result, null, 2), {
                status: 200,
                headers: corsHeaders
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: true,
                message: error.message,
                fetchedAt: new Date().toISOString()
            }, null, 2), {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};