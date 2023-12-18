// import { ZoteroItem } from "./zoteroItem";

export class Zapi {
    // Adapted from https://github.com/cboulanger/excite-docker/web/web/scripts.js

    static controller;
    static BASE_URL = `http://localhost:23119/`;
    static API_ENDPOINT = this.BASE_URL + "zotserver";
    // timeout 2 minutes
    static timeout = 2 * 60 * 1000;
    static isTimeout = false;
    static numberTimeouts = 0;

    static API = {
        // SELECTION_GET: this.API_ENDPOINT + "/selection/get",
        ITEM_ATTACHMENT_GET: this.API_ENDPOINT + "/getFile",
        SELECTED_ITEM_ATTACHMENT_GET: this.API_ENDPOINT + "/selected",
        LIBRARY_SEARCH: this.API_ENDPOINT + "/search",
        // ITEM_CREATE: this.API_ENDPOINT + "/item/create",
        // ITEM_UPDATE: this.API_ENDPOINT + "/item/update",
    }

    /**
     * Call the local Zotero server
     * @param {string} endpoint
     * @param {any} postData
     * @returns {Promise<*>}
     */

    static async callEndpoint(endpoint, postData = null) {
        this.controller = new AbortController();
        this.isTimeout = false;
        const timeoutFunc = () => {
            this.isTimeout = true;
            this.controller.abort();
        };
        const id = setTimeout(timeoutFunc, this.timeout);
        let result;
        try {
            let response = await fetch(endpoint, {
                method: postData ? "POST" : "GET",
                cache: 'no-cache',
                signal: this.controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: postData ? JSON.stringify(postData) + '\r\n' : null
            });
            result = await response.text();
            if (result.includes("Endpoint")) {
                throw new Error(result.replace("Endpoint", "Endpoint " + endpoint));
            }
            result = JSON.parse(result);
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        } catch (e) {
            if (e.name === "AbortError" && this.isTimeout) {
                if (++this.numberTimeouts < 3) {
                    return await this.callEndpoint(endpoint, postData);
                }
                this.numberTimeouts = 0;
                e = new Error(`Timeout trying to reach ${endpoint} (tried 3 times).`);
            }
            throw e;
        } finally {
            clearTimeout(id);
        }
    }
    static async search(conditions: any) {
        return await this.callEndpoint(
            this.API.LIBRARY_SEARCH,
            conditions
        )
    }
    static async getByEverything(query: string) {

        return await this.callEndpoint(
            this.API.LIBRARY_SEARCH,
            {
                condition: 'quicksearch-everything',
                value: query
            }
        )
    }

    static async getByTitleCreatorYear(query: string) {

        return await this.callEndpoint(
            this.API.LIBRARY_SEARCH,
            {
                condition: 'quicksearch-titleCreatorYear',
                value: query
            }
        )
    }

    static async getByTag(tag: string) {

        return await this.callEndpoint(
            this.API.LIBRARY_SEARCH,
            {
                condition: 'tag',
                // operator: 'is',
                value: tag
            }
        )
    }

    static async getAttachmentByItemKeys(keys: string[]) {
        return await this.callEndpoint(
            this.API.ITEM_ATTACHMENT_GET,
            keys
        )
    }

    static async getSelectedItems() {
        return await this.callEndpoint(
            this.API.SELECTED_ITEM_ATTACHMENT_GET,
        )
    }
    static async test_getAttachmentByKeys() {
        let keys = ["98GXDB7I"];
        let attachments = await this.getAttachmentByItemKeys(keys);
        console.log(attachments);
    }
}

