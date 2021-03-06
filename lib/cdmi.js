var CDMI = CDMI || {};
CDMI.VERSION = "0.1";
CDMI.AUTHORS = "GING";
CDMI.Rest = function (j, g) {
    var h;
    h = function (i, b, a, c, d, e, k, h, t) {
        var f, j;
        f = new XMLHttpRequest;
        f.open(i, b, !0);
        if (k != g) switch (k) {
        case "container":
            f.setRequestHeader("Content-Type", "application/cdmi-container");
            f.setRequestHeader("Accept", "application/json");
            break;
        case "object":
            f.setRequestHeader("Content-Type", "application/cdmi-object");
            f.setRequestHeader("X-CDMI-Specification-Version", "1.0.1");
            a = JSON.stringify({
             "mimetype" : t,
             "metadata" : { },
             "valuetransferencoding" : "base64",
             "value" : a
            });
            f.setRequestHeader("Accept", "application/json, application/octet-stream, application/cdmi-object");
            break;
        default:
            f.setRequestHeader("Accept", "application/cdmi-object")
        }
        f.onreadystatechange = function () {
            if (4 === f.readyState) switch (f.status) {
            case 100:
            case 200:
                if ("download" ===
                    h) {
                    void 0 !== f.responseText && "" !== f.responseText && d(f.responseText);
                    break
                }
            case 202:
            case 203:
            case 204:
            case 205:
                j = g;
                f.responseText !== g && "" !== f.responseText && (j = JSON.parse(f.responseText));
                d(j);
                break;
            case 400:
                e("400 Bad Request");
                break;
            case 201:
                d(f.status);
                break;
            case 401:
                e("401 Unauthorized");
                break;
            case 403:
                e("403 Access denied");
                break;
            case 409:
                f.status;
                break;
            default:
                e(f.status + " Error")
            }
        };
        c !== g && f.setRequestHeader("X-Auth-Token", c);
        a !== g ? f.send(a) : f.send()
    };
    return {
        get: function (i,
            b, a, c, d, e) {
            h("GET", i, g, b, a, c, d, e)
        },
        post: function (i, b, a, c, d, e) {
            h("POST", i, b, a, c, d, e)
        },
        put: function (i, b, a, c, d, e, t) {
            h("PUT", i, b, a, c, d, e, undefined, t)
        },
        del: function (i, b, a, c, d) {
            h("DELETE", i, g, b, a, c, d)
        }
    }
}(CDMI);
CDMI.Actions = function (j, g) {
    var h, i;
    h = {
        url: g,
        state: g,
        endpointType: "publicURL"
    };
    i = function () {
        if (JSTACK.Keystone !== g && JSTACK.Keystone.params.currentstate === JSTACK.Keystone.STATES.AUTHENTICATED) {
            var b = JSTACK.Keystone.getservice("object-store");
            h.url = b.endpoints[0][h.endpointType];
            return !0
        }
        return !1
    };
    return {
        params: h,
        check: i,
        getcontainerlist: function (b) {
            var a, c;
            i() && (a = function (a) {
                b !== g && b(a)
            }, c = function (a) {
                throw Error(a);
            }, j.Rest.get(h.url, JSTACK.Keystone.params.token, a, c, "container", void 0))
        },
        createcontainer: function (b,
            a) {
            var c, d, e, k;
            i() && (c = h.url + "/" + b, k = {
                metadata: {}
            }, d = function (b) {
                a !== g && a(b)
            }, e = function (a) {
                throw Error(a);
            }, j.Rest.put(c, k, JSTACK.Keystone.params.token, d, e, "container"))
        },
        deletecontainer: function (b, a) {
            var c, d, e;
            i() && (c = h.url + "/" + b, d = function (b) {
                a !== g && a(b)
            }, e = function (a) {
                throw Error(a);
            }, j.Rest.del(c, JSTACK.Keystone.params.token, d, e, "container"))
        },
        getobjectlist: function (b, a) {
            var c, d, e;
            i() && (c = h.url + "/" + b, d = function (b) {
                a !== g && a(b)
            }, e = function (a) {
                throw Error(a);
            }, j.Rest.get(c, JSTACK.Keystone.params.token,
                d, e, "object", void 0))
        },
        copyobject: function (b, a, c, d, e) {
            var g;
            i() && (g = h.url + "/" + c + "/" + d, b = h.url + "/" + b + "/" + a, a = function (a) {
                onOKCallback = function (a) {
                    void 0 !== e && e(a)
                };
                onErrorCallback = function (a) {
                    throw Error(a);
                };
                j.Rest.put(g, a, JSTACK.Keystone.params.token, onOKCallback, onErrorCallback, "object")
            }, c = function (a) {
                throw Error(a);
            }, j.Rest.get(b, JSTACK.Keystone.params.token, a, c, "object", "download"))
        },
        uploadobject: function (b, a, c, t, d) {
            var e;
            i() && (b = h.url + "/" + b + "/" + a, a = function (a) {
                d !== g && d(a)
            }, e = function (a) {
                throw Error(a);
            }, j.Rest.put(b, c, JSTACK.Keystone.params.token, a, e, "object", t))
        },
        downloadobject: function (b, a, c) {
            var d, e;
            i() && (d = h.url + "/" + b + "/" + a, a = function (a) {
                c !== g && c(a)
            }, e = function (a) {
                throw Error(a);
            }, j.Rest.get(d, JSTACK.Keystone.params.token, a, e, "object", "download"))
        },
        deleteobject: function (b, a, c) {
            var d;
            i() && (b = h.url + "/" + b + "/" + a, a = function (a) {
                c !== g && c(a)
            }, d = function (a) {
                throw Error(a);
            }, j.Rest.del(b, JSTACK.Keystone.params.token, a, d, "container"))
        }
    }
}(CDMI);