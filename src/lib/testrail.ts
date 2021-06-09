import request = require("unirest");
import {TestRailOptions, TestRailResult} from "./testrail.interface";

/**
 * TestRail basic API wrapper
 */
export class TestRail {
    private base: String;

    constructor(private options: TestRailOptions) {
        // compute base url
        this.base = `https://${options.domain}/index.php`;
    }

    private _post(api: String, body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            request("POST", this.base)
                .query(`/api/v2/${api}`)
                .headers({
                    "content-type": "application/json"
                })
                .type("json")
                .send(body)
                .auth(this.options.username, this.options.password)
                .end((res) => {
                    if (res.error) {
                        console.log("Error: %s", JSON.stringify(res.body));
                        reject(new Error(res.error));
                    }
                    resolve(res.body);
                });
        })
    }

    private _get(api: String, callback: Function, error?: Function) {
        var req = request("GET", this.base)
            .query(`/api/v2/${api}`)
            .headers({
                "content-type": "application/json"
            })
            .type("json")
            .auth(this.options.username, this.options.password)
            .end((res) => {
                if (res.error) {
                    console.log("Error: %s", JSON.stringify(res.body));
                    if (error) {
                        error(res.error);
                    } else {
                        throw new Error(res.error);
                    }
                }
                callback(res.body);
            });
    }

    /**
     * Fetchs test cases from projet/suite based on filtering criteria (optional)
     * @param {{[p: string]: number[]}} filters
     * @param {Function} callback
     */
    public fetchCases(filters?: { [key: string]: number[] }, callback?: Function): void {
        let filter = "";
        if(filters) {
            for (var key in filters) {
                if (filters.hasOwnProperty(key)) {
                    filter += "&" + key + "=" + filters[key].join(",");
                }
            }
        }

        let req = this._get(`get_cases/${this.options.projectId}&suite_id=${this.options.suiteId}${filter}`, (body) => {
            if (callback) {
                callback(body);
            }
        });
    }

    /**
     * Publishes results of execution of an automated test run
     * @param {string} name
     * @param {string} description
     * @param {TestRailResult[]} results
     * @param {Function} callback
     */
    public async publish(name: string, description: string, results: TestRailResult[], callback?: Function): Promise<void> {
        console.log(`Publishing ${results.length} test result(s) to ${this.base}`);

        if (this.options.runId === null || this.options.runId === undefined) {
            console.log(`Creating a test run`);
            const body = await this._post(`add_run/${this.options.projectId}`, {
                "suite_id": this.options.suiteId,
                "name": name,
                "description": description,
                "assignedto_id": this.options.assignedToId,
                "include_all": true
            });
            const runId = body.id;
            this.options.runId = runId;
            console.log(`Test Run ID created: ${this.options.runId}`);
        }

        await this._post(`add_results_for_cases/${this.options.runId}`, {
            results: results
        });
    }
}
