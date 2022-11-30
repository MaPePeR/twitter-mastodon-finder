/*
    twitter-mastodon-finder
    Copyright (C) 2022  MaPePeR, lucahammer

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

// https://stackoverflow.com/a/1349426/2256700
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// https://stackoverflow.com/a/18197341/2256700
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}


// From https://github.com/lucahammer/fedifinder/blob/860642f01b9ca74dd9287dc7ad95af00375b2ed3/public/client.js#L45-L86
// Copyright lucahammer
// MIT Licence
function nameFromUrl(urlstring) {
    // returns username without @
    let name = "";
    // https://host.tld/@name host.tld/web/@name/
    // not a proper domain host.tld/@name
    if (urlstring.includes("@")) {
        name = urlstring
            .split(/\/|\?/)
            .filter((urlparts) => urlparts.includes("@"))[0]
            .replace("@", "");
    // friendica: sub.domain.tld/profile/name
    } else if (urlstring.includes("/profile/")) {
        name = urlstring.split("/profile/").slice(-1)[0].replace(/\/+$/, "");
        // diaspora: domain.tld/u/name
    } else if (urlstring.includes("/u/")) {
        name = urlstring.split("/u/").slice(-1)[0].replace(/\/+$/, "");
        // peertube: domain.tld/u/name
    } else if (/\/c\/|\/a\//.test(urlstring)) {
        name = urlstring
            .split(/\/c\/|\/a\//)
            .slice(-1)[0]
            .split("/")[0];
    } else {
        console.log(`didn't find name in ${urlstring}`);
    }
    return name;
}

function handleFromUrl(urlstring) {
    // transform an URL-like string into a fediverse handle: @name@server.tld
    let name = nameFromUrl(urlstring);
    if (urlstring.match(/^http/i)) {
        // proper url
        let handleUrl = new URL(urlstring);
        return `@${name}@${handleUrl.host}`;
    } else {
        // not a proper URL
        let domain = urlstring.split("/")[0];
        return `@${name}@${domain}`;
    }
}

function findHandles(text) {
    // split text into string and check them for handles

    // remove weird characters and unicode font stuff
    text = text
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n@.^$]/gu, " ")
        .toLowerCase()
        .normalize("NFKD");

    // different separators people use
    let words = text.split(/,|\s|“|#|\(|\)|'|》|\?|\n|\r|\t|・|丨|\||…|\.\s|\s$/);
    words = words.map((w) => w.replace(/^:|\/$/g, ""));
    // remove common false positives
    let unwanted_domains =
        /gmail\.com(?:$|\/)|mixcloud|linktr\.ee(?:$|\/)|pinboard\.com(?:$|\/)|tutanota\.de(?:$|\/)|xing\.com(?:$|\/)|researchgate|about|bit\.ly(?:$|\/)|imprint|impressum|patreon|donate|facebook|github|instagram|t\.me(?:$|\/)|medium\.com(?:$|\/)|t\.co(?:$|\/)|tiktok\.com(?:$|\/)|youtube\.com(?:$|\/)|pronouns\.page(?:$|\/)|mail@|observablehq|twitter\.com(?:$|\/)|contact@|kontakt@|protonmail|traewelling\.de(?:$|\/)|press@|support@|info@|pobox|hey\.com(?:$|\/)/;
    words = words.filter((word) => !unwanted_domains.test(word));
    words = words.filter((w) => w);

    let handles = [];

    words.map((word) => {
        // @username@server.tld
        if (/^@[a-zA-Z0-9_-]+@.+\.[a-zA-Z]+$/.test(word)) {
            handles.push(word.replace(":", " "));
            // some people don't include the initial @
        } else if (/^[a-zA-Z0-9_-]+@.+\.[a-zA-Z|]+$/.test(word.replace(":", " "))) {
            handles.push(`@${word.replace(":", " ")}`);
            // server.tld/@username
            // friendica: sub.domain.tld/profile/name
        } else if (
            /^.+\.[a-zA-Z]+.*\/(@|web\/|profile\/|\/u\/|\/c\/)[a-zA-Z0-9_-]+\/*$/.test(
                word
            )
        ) {
            handles.push(handleFromUrl(word));
        }

        // experimental. domain.tld/name. too many false positives
        // pleroma, snusocial
        //else if (/^.+\.[a-zA-Z]+\/[a-zA-Z_]+\/?$/.test(word)) console.log(word);
    });
    return [...new Set(handles)];
}
//----------------------------



function unixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

class StateCard {
    constructor(el) {
        /** @type HTMLElement */
        this.el = el;
        this.stateEl = this.el.querySelector('.state');
    }
    setState(state, reason) {
        this.state = state;
        const header = this.el.querySelector('.card-header');
        header.classList.remove('text-bg-info', 'text-bg-success', 'text-bg-danger');
        this.stateEl.innerText = reason;
        if (this.state == null) {
            header.classList.add('text-bg-info');
        } else if (this.state) {
            header.classList.add('text-bg-success');
        } else {
            header.classList.add('text-bg-danger');
        }
    }
}
class CORSProxy extends StateCard {
    constructor(el) {
        super(el);
        this.form = this.el.querySelector('form');
        this.corsProxyInput = this.form.querySelector('#corsProxyAddress');
        this.form.querySelector('#testCorsButton').addEventListener('click', this.testButtonClicked.bind(this));
        this.setState(null, '');
        this.loadFromStorage();
    }

    testButtonClicked() {
        if (!this.form.checkValidity()) return;
        this.setState(null, 'Testing...');
        fetch(this.getProxyURL('')).then((response) => {
            this.setState(true, 'Test successful');
            this.storeProxyURI();
        }).catch((reason) => {
            this.setState(false, 'Test failed: ' + reason);
            console.log(reason);
        });
    }


    getProxyURL(path) {
        if (!this.form.checkValidity()) {
            throw "Invalid CORS proxy URL";
        }
        return this.corsProxyInput.value.replace(/\/$/, "") + path;
    }

    storeProxyURI() {
        sessionStorage.setItem('cors_proxy_uri', this.corsProxyInput.value);
    }
    loadFromStorage() {
        this.corsProxyInput.value = sessionStorage.getItem('cors_proxy_uri') || '';
    }
}

class TwitterAccess extends StateCard {
    constructor(el) {
        super(el);
        this.loginButton = this.el.querySelector('#twitterLoginButton');
        this.loginButton.addEventListener('click', () => {
            corsProxy.storeProxyURI();
            document.location = this.generateAuthURL();
        });
        this.logoutButton = this.el.querySelector('#twitterLogoutButton');
        this.logoutButton.addEventListener('click', this.logout.bind(this));

        if (!this.checkSessionStorage()) {
            this.checkReturnAuthorize();
        } else {
            this.loginButton.disabled = true;
        }
    }

    checkSessionStorage() {
        const storageToken = sessionStorage.getItem('twitter_access_oauth_token');
        if (storageToken) {
            const token = JSON.parse(storageToken);
            if (token.expires_at > unixTimestamp()) {
                this.token = token;
                this.setState(true, "Got access token from Session storage");
                return true;
            } else {
                sessionStorage.removeItem('twitter_access_oauth_token');
            }
        }
        return false;
    }

    checkReturnAuthorize() {
        const queryParams = new URLSearchParams(location.search.charAt(0) == '?' ? location.search : undefined);
        if (queryParams.has('state')) {
            if (queryParams.get('state') !== this.getLastState()) {
                this.setState(false, 'Authorization returned with invalid state');
            }
            if (queryParams.has('error')) {
                this.setState(false, 'Authorization returned with error: ' + queryParams.get('error') + ' ' + (queryParams.get('error_description') || ''));
            }
            if (queryParams.has('code')) {
                this.setState(null, 'Got Code... Trying to get Access Token');
                this.getAccessToken(queryParams.get('code')).then((token) => {
                    this.setState(true, 'Got Access Token');
                    location.search = '';
                }).catch((reason) => {
                    this.setState(false, 'Error getting Access token:' + reason);
                });
            }
        }
    }

    getURL(path) {
        return corsProxy.getProxyURL(path);
    }

    getAccessToken(code) {
        const url = this.getURL('/2/oauth2/token');
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('code_verifier', this.getLastChallenge());
        params.append('client_id', config.clientId);
        params.append('redirect_uri', config.redirectURL);
        return fetch(url, {
            method: 'POST',
            credentials: 'omit',
            body: params,
        }).then((response) => response.json()).then((jsonResponse) => {
            console.log(jsonResponse);
            if (jsonResponse.error) {
                throw jsonResponse.error + (jsonResponse.error_description ? ' ' + jsonResponse.error_description : '');
            }
            if (jsonResponse.token_type === 'bearer' && jsonResponse.access_token && jsonResponse.expires_in) {
                return {
                    access_token: jsonResponse.access_token,
                    expires_at: unixTimestamp() + jsonResponse.expires_in,
                };
            }
            throw "Couldn't get access token from Response";
        }).then((access_token) => {
            this.token = access_token;
            sessionStorage.setItem('twitter_access_oauth_token', JSON.stringify(access_token));
            return access_token;
        });
    }

    generateAuthURL() {
        /* global config */
        const scopes = encodeURIComponent(["tweet.read", "users.read", "follows.read"].join(' '));
        const clientId = encodeURIComponent(config.clientId);
        const redirectUrl = encodeURIComponent(config.redirectURL);
        const state = this.createNewState();
        const challenge = this.createChallenge();

        return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUrl}&scope=${scopes}&state=${state}&code_challenge=${challenge}&code_challenge_method=plain`;
    }

    logout() {
        const url = this.getURL('/2/oauth2/revoke');
        const params = new URLSearchParams();
        params.append('token', this.token.access_token);
        params.append('client_id', config.clientId);
        params.append('token_type_hint', 'access_token');
        this.logoutButton.disabled = true;
        this.loginButton.disabled = false;

        fetch(url, {
            method: 'POST',
            credentials: 'omit',
            body: params,
        })
        .then((response) => response.json())
        .then((response) => {
            console.log(response);
            this.setState(null, "Logout successful");
            sessionStorage.removeItem('twitter_access_oauth_token');
            this.token = null;
        }).finally(() => {
            this.loginButton.disabled = false;
        });
    }

    createNewState() {
        const state = makeid(32);
        sessionStorage.setItem('twitter_access_oauth_state', state);
        return state;
    }

    getLastState() {
        return sessionStorage.getItem('twitter_access_oauth_state');
    }

    createChallenge() {
        const challenge = makeid(32);
        sessionStorage.setItem('twitter_access_oauth_challenge', challenge);
        return challenge;
    }

    getLastChallenge() {
        return sessionStorage.getItem('twitter_access_oauth_challenge');
    }
}

function waitPromise(time, value) {
    return new Promise((resolve, reject) => setTimeout(() => resolve(value), time));
}

class TwitterData extends StateCard {
    constructor(el) {
        super(el);
        this.listTemplate = el.querySelector('#twitterFollowingTemplate');
        this.listHeaderTemplate = el.querySelector('#twitterFollowingHostHeaderTemplate');
        this.handleTemplate = el.querySelector('#handleTemplate');
        this.listEl = el.querySelector('.list-group');
        this.exportCSVButton = el.querySelector('#exportCSV');
        this.loadDataButton = this.el.querySelector('button');
        this.loadDataButton.addEventListener('click', this.loadData.bind(this));
        this.listEl.addEventListener('change', this.changeCheckbox.bind(this));
        this.exportCSVButton.addEventListener('click', this.exportCSV.bind(this));
    }
    loadData() {
        this.setState(null, "Loading Account data");
        this.loadDataButton.disabled = true;
        waitPromise(1)
        .then(() => this.loadUserData())
        .then((userData) => {
            this.setState(null, "Loading following data");
            this.followings = new Map();
            return this.loadFollowings(userData.id, null);
        })
        .then((followings) => {
            this.createList(followings);
            this.setState(true, "Loaded all following data");
            this.exportCSVButton.disabled = false;
        })
        .catch((reason) => {
            this.setState(false, "Failed to load followings: " + reason);
            this.loadDataButton.disabled = false;
            throw reason;
        });
    }

    getHeader() {
        if (!twitterAccess || !twitterAccess.token || !twitterAccess.token.access_token) {
            throw "No access token";
        }
        return {
            Authorization: `Bearer ${twitterAccess.token.access_token}`,
        };
    }

    loadUserData() {
        return fetch(twitterAccess.getURL('/2/users/me?expansions=pinned_tweet_id&tweet.fields=text,entities&user.fields=name,username,description,location,entities,url'), {
            headers: this.getHeader(),
        }).then((r) => r.json())
        .then(this.preparePinnedTweetIncludes)
        .then((userData) => {
            if (userData.data) {
                this.parseUser(userData.data, userData.includes.tweets);
                console.log(userData);
                return userData.data;
            }
            console.log("Couldn't get user data", userData);
            throw "Couldn't get user data";
        });
    }

    loadFollowings(id, cursor) {
        return fetch(twitterAccess.getURL(`/2/users/${id}/following?expansions=pinned_tweet_id&max_results=1000&tweet.fields=text,entities&user.fields=name,username,description,location,entities,url,profile_image_url` + (cursor ? `&pagination_token=${cursor}` : '')), {
            headers: this.getHeader(),
        }).then((response) => response.json())
        .then(this.preparePinnedTweetIncludes)
        .then((jsonResponse) => {
            jsonResponse.data.forEach((user) => {
                this.parseUser(user, jsonResponse.includes.tweets);
                for (const handle of user.possible_handles) {
                    const host = handle.split('@', 3)[2];
                    if (!this.followings.has(host)) {
                        this.followings.set(host, new Map());
                    }
                    //TODO: There might be multiple accounts presenting the same mastodon handle.
                    this.followings.get(host).set(handle, user);
                }
            });
            if (jsonResponse.meta && jsonResponse.meta.next_token) {
                return waitPromise(2000).then(() => {
                    this.loadFollowings(id, jsonResponse.meta.next_token);
                });
            } else {
                return this.followings;
            }
        });
    }

    preparePinnedTweetIncludes(jsonResponse) {
        if (jsonResponse.includes) {
            if (jsonResponse.includes.tweets) {
                const pinnedTweets = new Map();
                for (const tweet of Object.values(jsonResponse.includes.tweets)) {
                    pinnedTweets.set(tweet.id, tweet);
                }
                jsonResponse.includes.tweets = pinnedTweets;
            } else {
                jsonResponse.includes.tweets = new Map();
            }
        } else {
            jsonResponse.includes = {
                tweets: new Map(),
            };
        }
        return jsonResponse;
    }

    parseUser(userData, pinnedTweets) {
        const texts = [userData.description, userData.name];
        if ("entities" in userData && "description" in userData.entities && "urls" in userData.entities) {
            texts.push(...userData.entities.urls.map((u) => u.expanded_url));
        }
        if ("location" in userData) {
            texts.push(userData.location);
        }
        if ("pinned_tweet_id" in userData && pinnedTweets.has(userData.pinned_tweet_id)) {
            const pinnedTweet = pinnedTweets.get(userData.pinned_tweet_id);
            texts.push(pinnedTweet.text);
            if ("entities" in pinnedTweet && "urls" in pinnedTweet.entities) {
                texts.push(...pinnedTweet.entities.urls.map((u) => u.expanded_url));
            }
        }
        if ("url" in userData) {
            texts.push(userData.url);
        }
        const possibleHandles = findHandles(texts.join(' '));
        userData.possible_handles = possibleHandles;
        return userData;
    }

    createList(followings) {
        const fragment = document.createDocumentFragment();
        for (const [host, users] of followings) {
            const hostHeader = this.listHeaderTemplate.content.cloneNode(true);
            const hostCheckbox = hostHeader.querySelector('input');
            const hostLabel = hostHeader.querySelector('label');
            const id = 'select_host_' + host;
            hostCheckbox.id = id;
            hostCheckbox.setAttribute('value', host);
            hostLabel.innerText = host;
            hostLabel.setAttribute('for', id);
            fragment.appendChild(hostHeader);
            for (const [handle, user] of users) {
                fragment.appendChild(this.createUserListItem(handle, user));
            }
        }
        this.listEl.replaceChildren(fragment);
    }

    createUserListItem(handle, user) {
        const clone = this.listTemplate.content.cloneNode(true);
        clone.querySelector('.twitterName').innerText = user.name;
        clone.querySelector('.twitterHandle').innerText = '@' + user.username;
        clone.querySelector('img').src = user.profile_image_url;
        clone.querySelector('.mastodonHandle').innerText = handle;
        const id = 'select_' + handle;
        const checkbox = clone.querySelector('input.form-check-input');
        checkbox.id = id;
        checkbox.setAttribute('value', handle);
        clone.querySelector('label.form-check-label').setAttribute('for', id);
        return clone;
    }

    changeCheckbox(evt) {
        console.log(evt);
        if (evt.target.matches('.hostCheckbox')) {
            const host = evt.target.value;
            this.listEl.querySelectorAll('input.handleCheckbox[type="checkbox"][value$="@' + host + '"]').forEach((el) => {
                el.checked = evt.target.checked;
            });
        } else if (evt.target.matches('.handleCheckbox')) {
            const handle = evt.target.value;
            const host = handle.split('@', 3)[2];
            const allEqual = [...this.listEl.querySelectorAll('input.handleCheckbox[type="checkbox"][value$="@' + host + '"]')]
                .map((el) => el.checked)
                .every((value, index, array) => value == array[0]);
            const hostCheckbox = this.listEl.querySelector('input.hostCheckbox[type="checkbox"][value="' + host + '"]');
            if (allEqual) {
                hostCheckbox.checked = evt.target.checked;
                hostCheckbox.indeterminate = false;
            } else {
                hostCheckbox.indeterminate = true;
            }
        }
    }

    exportCSV() {
        const content = ["Account address,Show boosts,Notify on new posts,Languages\n"];
        for (const input of this.listEl.querySelectorAll('.handleCheckbox:checked')) {
            console.log(input);
            content.push(input.value);
            content.push(",true,false,\n");
        }
        download('twitterFollowings.csv', content.join(''));
    }
}

const corsProxy = new CORSProxy(document.getElementById('corsProxy'));
const twitterAccess = new TwitterAccess(document.getElementById('twitter'));
new TwitterData(document.getElementById('twitterData'));
