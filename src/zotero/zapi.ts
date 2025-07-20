export interface ZoteroAPI {
    BASE_URL: string;
    API_ENDPOINT: string;
    API: {};
    // function getByEverything
    getByEverything(query: string): Promise<any>;
    // function search
    search(conditions: any): Promise<any>;

}

export class Zapi implements ZoteroAPI {
    // Adapted from https://github.com/cboulanger/excite-docker/web/web/scripts.js

    static controller: AbortController;
    BASE_URL = `http://localhost:23119/`;
    API_ENDPOINT = this.BASE_URL + "zotserver";
    // timeout 2 minutes
    static timeout = 2 * 60 * 1000;
    static isTimeout = false;
    static numberTimeouts = 0;

    API = {
        // SELECTION_GET: this.API_ENDPOINT + "/selection/get",
        ITEM_ATTACHMENT_GET_BY_KEY: this.API_ENDPOINT + "/get",
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

    static async callEndpoint(endpoint: any, postData: any = null) {
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
            console.log(e.message, this.numberTimeouts);

            if (e.message === 'Failed to fetch') {
                logseq.UI.showMsg("PDF-Extract: Please run Zotero first. For more info check 👉  https://github.com/e-zz/logseq-pdf-extract#-installation", "warning", { timeout: 8000 })
            }

            throw e;
        } finally {
            clearTimeout(id);
        }
    }
    async search(conditions: any) {
        return await Zapi.callEndpoint(
            this.API.LIBRARY_SEARCH,
            conditions
        )
    }
    async getByEverything(query: string) {

        return await Zapi.callEndpoint(
            this.API.LIBRARY_SEARCH,
            {
                condition: 'quicksearch-everything',
                value: query
            }
        )
    }

    async getByTitleCreatorYear(query: string) {

        return await Zapi.callEndpoint(
            this.API.LIBRARY_SEARCH,
            {
                condition: 'quicksearch-titleCreatorYear',
                value: query
            }
        )
    }

    async getByTag(tag: string) {

        return await Zapi.callEndpoint(
            this.API.LIBRARY_SEARCH,
            {
                condition: 'tag',
                // operator: 'is',
                value: tag
            }
        )
    }

    async getItemByKeys(keys: string[]) {
        return await Zapi.callEndpoint(
            this.API.ITEM_ATTACHMENT_GET_BY_KEY,
            keys
        )
    }
    async getAttachmentByKeys(keys: string[]) {
        return await Zapi.callEndpoint(
            this.API.ITEM_ATTACHMENT_GET_BY_KEY,
            keys
        )
    }

    async getBySelection() {
        return await Zapi.callEndpoint(
            this.API.SELECTED_ITEM_ATTACHMENT_GET,
        )
    }
    async test_getAttachmentByKeys() {
        let keys = ["98GXDB7I"];
        let attachments = await this.getAttachmentByKeys(keys);
        console.log(attachments);
    }
}

// Utility to parse settings string to object
function parseQueryParams(str: string): Record<string, string> {
    // Example input: "{ qmode: 'everything', itemType: '-attachment', limit: '100' }"
    // Remove braces and whitespace, split by comma, then by colon
    return str
        .replace(/[{}]/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .reduce((acc, pair) => {
            const [key, value] = pair.split(':').map(x => x.trim().replace(/^'|'$/g, ''));
            if (key && value) acc[key] = value;
            return acc;
        }, {} as Record<string, string>);
}

export class Zapi7 implements ZoteroAPI {
    // Zotero 7 Local API
    // https://github.com/zotero/zotero/blob/a7778b93e841ce62773efc65cd86576c7bfe8af1/chrome/content/zotero/xpcom/localAPI/server_localAPI.js

    static BASE_URL = `http://127.0.0.1:23119/api`;
    static userOrGroup = 'users/0'
    static API_ENDPOINT = `${this.BASE_URL}/${this.userOrGroup}`;

    static API = {
        ITEMS: this.API_ENDPOINT + "/items",
    }

    static CallEndpoint(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: "GET",
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => resolve(data))
                .catch((error) => reject(error));
        });
    }

    async getItem(query: string, options: Record<string, string> = {}): Promise<any> {
        const settingsString = logseq.settings?.zotero_query_params || "{ qmode: 'everything', itemType: '-attachment', limit: '100' }";
        const settingsParams = parseQueryParams(settingsString);

        const parameters = {
            q: query,
            ...settingsParams,
            ...options // Allow overriding defaults
        };

        const queryString = new URLSearchParams(parameters).toString();
        const url = `${Zapi7.API.ITEMS}?${queryString}`;

        return await Zapi7.CallEndpoint(url);
    }

    // Get items data
    async getByEverything(query: string, options: Record<string, string> = {}): Promise<any> {
        let res = await this.getItem(query, options);

        // format the response by keeping only the data field
        res = res.map((i: any) => i.data)
        if (debug_zotero) console.log("in Zotero.getByEverything:\t", res);

        return res
    }

    async getRecentModified(): Promise<any> {

        const settingsString = logseq.settings?.zotero_query_params
        // regex to match limit
        const limitMatch = settingsString.match(/limit:\s*'(\d+)'/);
        const limit = limitMatch ? limitMatch[1] : '100'; // Default to 100 if not specified


        const url = `${Zapi7.API.ITEMS}?itemType=-attachment&sort=dateModified&limit=${limit}`;
        const res = await Zapi7.CallEndpoint(url);
        // format the response by keeping only the data field
        return res.map((i: any) => i.data);
    }


    async search(conditions: any): Promise<any> {

    }

    async getAttachmentByURL(attachmentUrl: string) {
        const attachmentResponse = await fetch(attachmentUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Parse attachment JSON
        const attachmentData = await attachmentResponse.json();
        return attachmentData['data'];
    }

    /**
     * Fetches all attachments for a given parent item by its key
     * @param key The Zotero item key of the parent item
     * @returns An array of attachment data objects
     * @throws Error if the API request fails or returns a non-200 status
     */
    async getAttachmentsByParentKey(key: string): Promise<any[]> {
        const url = `${Zapi7.API.ITEMS}/${key}/children`;

        try {
            const attachments = await Zapi7.CallEndpoint(url);

            if (debug_zotero) {
                console.log("Fetched attachments for item:", key);
                console.log("Attachment count:", attachments.length);
            }

            // Extract only the data field from each attachment
            return attachments
                .filter((attachment: any) => attachment?.data)
                .map((attachment: any) => attachment.data);
        } catch (error) {
            console.error(`Error fetching attachments for item ${key}:`, error);
            throw error;
        }
    }

    /**
     * Fetches items by their Zotero item keys and transforms the response to match expected format
     * @param keys Array of Zotero item keys to fetch
     * @returns Array of items with their attachments
     * @throws Error if the API request fails or returns a non-200 status
     */
    async getItemByKeys(keys: string[]): Promise<any[]> {
        if (!keys || keys.length === 0) {
            return [];
        }

        // Build the query parameters
        const parameters = {
            itemKey: keys.join(',')
        };

        const queryString = new URLSearchParams(parameters).toString();
        const url = `${Zapi7.API.ITEMS}?${queryString}`;

        try {

            const data = await Zapi7.CallEndpoint(url);

            if (debug_zotero) {
                console.log("Fetched items:", data.length);
                console.log("API URL:", url);
            }

            // Transform API response to match expected format
            const transformedData = await Promise.all(data.map(async (item: any) => {
                // Create the base result structure
                const result = {
                    item: item.data,
                    citationKey: item.data.citationKey || '',
                    attachments: [],
                    aux: {
                        baseName: item.data?.title || ''
                    }
                };

                // Skip attachment processing if no attachments
                if (!item.links?.attachment) {
                    return result;
                }

                // Fetch attachments for this item
                const attachmentsData = await this.getAttachmentsByParentKey(item.key);

                result.attachments = attachmentsData;

                return result;
            }));

            return transformedData;
        } catch (error) {
            console.error(`Error in getItemByKeys:`, error);
            throw error;
        }
    }

}