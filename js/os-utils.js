var UTILS = UTILS || {};

// Current version is **0.1**.

UTILS.VERSION = '0.1';

// It has been developed by GING (New Generation Internet Group) in
// the Technical University of Madrid.
UTILS.AUTHORS = 'GING';

UTILS.Auth = (function(U, undefined) {

    var tenants = [];

    var access_token_;

    var current_region_;

    var is_idm_ = false;

    function initialize(url, adminUrl, isIDM) {
        JSTACK.Keystone.init(url, adminUrl);
        is_idm_ = isIDM || false;
    }

    function isIDM() {
        return is_idm_;
    }

    function goAuth() {
        window.location.href = '/idm/auth';
    }
    function logout() {
        window.location.href = '#auth/logout';
    }

    function getToken() {
        return JSTACK.Keystone.params.token;
    }

    function getName() {
        return JSTACK.Keystone.params.access.user.name;
    }

    function getTenants(callback, access_token) {
        if (U.Auth.isIDM() && access_token) {
            JSTACK.Keystone.params.token = access_token;
        }
        return JSTACK.Keystone.gettenants(callback, false);
    }

    var getCurrentTenant = function() {
        return JSTACK.Keystone.params.access.token.tenant;
    };

    var getRegions = function() {
        var servs = JSTACK.Keystone.getservicelist();
        var regs = [];
        for (var s in servs) {
            if (servs[s].name === 'nova') {
                regs.push(servs[s].endpoints[0].region);
            }
        }
        return regs;
    };

    var getCurrentRegion = function() {
        return current_region_;
    };

    var switchRegion = function(regId) {
        current_region_ = regId;
        if (isAuthenticated()) {

            var objectstorage = JSTACK.Keystone.getservice("object-store");
            objectstorage.endpoints[0].adminURL = current_region_  + "/object-store" + objectstorage.endpoints[0].adminURL.split('object-store')[1];
            objectstorage.endpoints[0].publicURL = current_region_  + "/object-store" + objectstorage.endpoints[0].publicURL.split('object-store')[1];
            objectstorage.endpoints[0].internalURL = current_region_  + "/object-store" + objectstorage.endpoints[0].internalURL.split('object-store')[1];

            var compute = JSTACK.Keystone.getservice("compute");
            compute.endpoints[0].adminURL = current_region_ + "/compute" + compute.endpoints[0].adminURL.split('compute')[1];
            compute.endpoints[0].publicURL = current_region_ + "/compute" + compute.endpoints[0].publicURL.split('compute')[1];
            compute.endpoints[0].internalURL = current_region_ + "/compute" + compute.endpoints[0].internalURL.split('compute')[1];
        
            var volume = JSTACK.Keystone.getservice("volume");
            volume.endpoints[0].adminURL = current_region_ + "/volume" + volume.endpoints[0].adminURL.split('volume')[1];
            volume.endpoints[0].publicURL = current_region_ + "/volume" + volume.endpoints[0].publicURL.split('volume')[1];
            volume.endpoints[0].internalURL = current_region_ + "/volume" + volume.endpoints[0].internalURL.split('volume')[1];

            var image = JSTACK.Keystone.getservice("image");
            image.endpoints[0].adminURL = current_region_ + "/image" + image.endpoints[0].adminURL.split('image')[1];
            image.endpoints[0].publicURL = current_region_ + "/image" + image.endpoints[0].publicURL.split('image')[1];
            image.endpoints[0].internalURL = current_region_ + "/image" + image.endpoints[0].internalURL.split('image')[1];

            var neutron = JSTACK.Keystone.getservice("network");
            if (neutron !== undefined) {
                neutron.endpoints[0].adminURL = current_region_ + "/network" + neutron.endpoints[0].adminURL.split('network')[1];
                neutron.endpoints[0].publicURL = current_region_ + "/network" + neutron.endpoints[0].publicURL.split('network')[1];
                neutron.endpoints[0].internalURL = current_region_ + "/network" + neutron.endpoints[0].internalURL.split('network')[1];
            }
        }
    };

    var isAuthenticated = function() {
        return JSTACK.Keystone.params.currentstate == JSTACK.Keystone.STATES.AUTHENTICATED;
    };

    var isAdmin = function() {
        var roles = JSTACK.Keystone.params.access.user.roles;
        //console.log("Roels: ", roles);
        for (var index in roles) {
            var rol = roles[index];
            if (rol.name === "admin")
            return true;
        }
        return false;
    };

    var switchTenant = function(tenant, access_token, callback, error) {
        if (U.Auth.isIDM()) {
            authenticate(tenant, access_token, callback, error);
        } else {
            authenticateWithCredentials(undefined, undefined, tenant, JSTACK.Keystone.params.token, callback, error);
        }
    };


    function authenticateWithCredentials(username, password, tenant, token, callback, error) {

        var _authenticatedWithTenant = function (resp) {
            console.log(resp);
            console.log("Authenticated in tenant ", tenant);

            changeEndpoints();
            
            callback();
        };

        var _authenticatedWithToken = function (resp) {
            callback();
        };

        var _authenticatedWithoutTenant = function(resp) {
            var ok = function (resp) {
                console.log("Tenants received", resp);
                tenants = resp.tenants;
                _tryTenant();
            };

            JSTACK.Keystone.gettenants(ok);
        };

        var _tryTenant = function(tenant) {
            console.log("Trying tenant ", tenant);
            if (tenants.length > 0) {
                tenant = tenant || tenants.pop();
                console.log("Authenticating for tenant " + JSON.stringify(tenant.id));
                JSTACK.Keystone.authenticate(undefined, undefined, JSTACK.Keystone.params.token, tenant.id, _authenticatedWithTenant, _error);
            } else {
                console.log("Error authenticating");
                error("No tenant");
            }
        };


        var getToken = function() {
            return JSTACK.Keystone.params.token;
        };

        var onError = function(msg) {
            error(msg);
        };

        var _error = function() {
            _tryTenant();
        };

        var _credError = function() {
            error("Bad credentials");
        };

        var success;

        if (tenant !== undefined) {
            success = _authenticatedWithTenant;
            console.log("Authenticating with tenant");
        } else if (token !== undefined) {
            success = _authenticatedWithoutTenant;
            console.log("Authenticating with token");
        } else {
            success = _authenticatedWithoutTenant;
            console.log("Authenticating without tenant");
        }
        JSTACK.Keystone.authenticate(username, password, token, tenant, success, _credError);
    }

    function authenticate(tenant, access_token, callback, error) {
        access_token_ = access_token;

        var tenant_ = tenant;

        var _authenticatedWithTenant = function (resp) {
            console.log("Authenticated for tenant ", tenant_);
            console.log("Token: ", JSTACK.Keystone.params.access.token.id);

            changeEndpoints();

            var t = Object.create(resp.access.token.tenant);
            t.id = tenant_;
            callback(t);
        };

        var _tryTenant = function(tenants) {
            if (tenants.length > 0) {
                tenant_ = tenant_ || tenants.pop().id;
                console.log("Authenticating for tenant " + tenant_);
                JSTACK.Keystone.authenticate(undefined, undefined, access_token, tenant_, _authenticatedWithTenant, _error);
            } else {
                console.log("Error authenticating");
                error("No tenant");
            }
        };


        var getToken = function() {
            return JSTACK.Keystone.params.token;
        };

        var onError = function(msg) {
            error(msg);
        };

        var _error = function() {
            _tryTenant();
        };

        var _credError = function() {
            error("Bad credentials");
        };

        if (tenant_ !== undefined) {
            console.log("Authenticating with tenant");
            JSTACK.Keystone.authenticate(undefined, undefined, access_token, tenant_, _authenticatedWithTenant, _credError);
        } else {
            console.log("Authenticating without tenant");
            getTenants(function (resp) {
                tenants = resp.tenants;
                _tryTenant(tenants);
            }, access_token_);
        }

    }

    function changeEndpoints () {

        var host = "localhost:8080";
        host = document.URL.match(/http.?:\/\/([^\/]*)\/.*/)[1];

        console.log("Changing endpoint URLS to ", host);

        var compute = JSTACK.Keystone.getservice("compute");
        compute.endpoints[0].adminURL = current_region_ + "/compute" + compute.endpoints[0].adminURL.split('8774')[1];
        compute.endpoints[0].publicURL = current_region_ + "/compute" + compute.endpoints[0].publicURL.split('8774')[1];
        compute.endpoints[0].internalURL = current_region_ + "/compute" + compute.endpoints[0].internalURL.split('8774')[1];
    
        var volume = JSTACK.Keystone.getservice("volume");
        volume.endpoints[0].adminURL = current_region_ + "/volume" + volume.endpoints[0].adminURL.split('8776')[1];
        volume.endpoints[0].publicURL = current_region_ + "/volume" + volume.endpoints[0].publicURL.split('8776')[1];
        volume.endpoints[0].internalURL = current_region_ + "/volume" + volume.endpoints[0].internalURL.split('8776')[1];

        var image = JSTACK.Keystone.getservice("image");
        image.endpoints[0].adminURL = current_region_ + "/image" + image.endpoints[0].adminURL.split('9292')[1];
        image.endpoints[0].publicURL = current_region_ + "/image" + image.endpoints[0].publicURL.split('9292')[1];
        image.endpoints[0].internalURL = current_region_ + "/image" + image.endpoints[0].internalURL.split('9292')[1];

        var objectstorage = JSTACK.Keystone.getservice("object-store");
        console.log("Object store endpoint", objectstorage.endpoints[0].publicURL);
        objectstorage.endpoints[0].adminURL = current_region_  + "/object-store" + objectstorage.endpoints[0].adminURL.split('8080')[1];
        objectstorage.endpoints[0].publicURL = current_region_  + "/object-store" + objectstorage.endpoints[0].publicURL.split('8080')[1];
        objectstorage.endpoints[0].internalURL = current_region_  + "/object-store" + objectstorage.endpoints[0].internalURL.split('8080')[1];

        var neutron = JSTACK.Keystone.getservice("network");
        if (neutron !== undefined) {
            neutron.endpoints[0].adminURL = current_region_ + "/network" + neutron.endpoints[0].adminURL.split('9696')[1];
            neutron.endpoints[0].publicURL = current_region_ + "/network" + neutron.endpoints[0].publicURL.split('9696')[1];
            neutron.endpoints[0].internalURL = current_region_ + "/network" + neutron.endpoints[0].internalURL.split('9696')[1];
        }
    }

    return {
        initialize: initialize,
        goAuth: goAuth,
        logout: logout,
        authenticate: authenticate,
        authenticateWithCredentials: authenticateWithCredentials,
        getToken: getToken,
        getName: getName,
        isAuthenticated: isAuthenticated,
        getCurrentTenant: getCurrentTenant,
        getTenants: getTenants,
        getRegions: getRegions,
        getCurrentRegion: getCurrentRegion,
        switchRegion: switchRegion,
        switchTenant: switchTenant,
        isAdmin: isAdmin,
        isIDM: isIDM
    };

})(UTILS);

UTILS.Render = (function(U, undefined) {

    function animateRender(el, template, model, callback) {
        var temp = template(model);
        $(temp).hide();
        $(el).append(temp);
        //$(el).animate( {
        //                marginLeft: "+1250px",
        //                marginRight: "-1250px"
        //              }, 200, function() {
        //    temp = template(model);
            $(temp).show();
            $(el).html(temp).css('marginLeft', '1250px').css('marginRight', '-1250px').animate( {
                marginLeft: "-=1250px",
                marginRight: "+=1250px"
                      }, 200, function() {
                          if (callback !== undefined) {
                              callback();
                          }
                      });
        //    });
       return temp;
    }

    return {
        animateRender: animateRender
    };
})(UTILS);

UTILS.i18n = (function(U, undefined) {

    var dict = {
    };

    var params = {
        lang : "en",
        dict: dict
    };

    function init() {
        _.extend(_, {itemplate : function(html) {
            var simple = _.template(html);
            var func = function(args) {
                var init = simple(args);

                init = U.i18n.translate(init);
                return init;
            };
            return func;
        }});
        if (localStorage.i18nlang === undefined) {
            localStorage.i18nlang = 'en';
        }
        UTILS.i18n.setlang(localStorage.i18nlang);
        console.log("Language: " + localStorage.i18nlang);
    }

    function setlang(lang, callback) {
        var url = "locales/"+lang+".json?random=" + Math.random()*99999;
        $.ajax({
            url: url,
            success: function(data, status, xhr) {
                console.log('loaded: ' + url);
                U.i18n.params.dict = data;
                localStorage.i18nlang = lang;
                if (callback !== undefined)
                    callback();
            },
            error : function(xhr, status, error) {
                console.log('failed loading: ' + url);
                if (callback !== undefined)
                    callback();
            },
            dataType: "json"
        });
    }

    function translateNodes(el) {
        var html = $(el);
        var items = html.find("*[data-i18n]");
        items.each(function(index, item) {
            item = $(items[index], el);
            var newItem = U.i18n.get(item.attr("data-i18n"));
            if (newItem !== undefined) {
                var copy = item.clone();
                item.text(newItem);
                html.find(copy).replaceWith(item);
            }
        });
        return html;
    }

    function translate(html) {
        var initTime = new Date().getTime();
        html = translateNodes(html);
        var duration = new Date().getTime()-initTime;
        //console.log("Internationalization duration: " + duration);
        return html;
    }

    function pluralise(s, p, n) {
        var text = U.i18n.get(s);
        if (n != 1) text = U.i18n.get(p);
        var out = sprintf(text, n);
        return out;
    }

    function get(data) {
        var newItem = U.i18n.params.dict[data];
        if (newItem === undefined)
            newItem = data;
        return newItem;
    }

    function sprintf(s) {
        var bits = s.split('%');
        var out = bits[0];
        var re = /^([ds])(.*)$/;
        for (var i=1; i<bits.length; i++) {
            p = re.exec(bits[i]);
            if (!p || arguments[i]===null) continue;
            if (p[1] == 'd') {
                out += parseInt(arguments[i], 10);
            } else if (p[1] == 's') {
                out += arguments[i];
            }
            out += p[2];
        }
        return out;
    }

    return {
        params      :     params,
        init        :     init,
        setlang     :     setlang,
        translate   :     translate,
        get         :     get,
        pluralise   :     pluralise
    };
})(UTILS);

UTILS.i18n.init();

Utils.Me = (function(U, undefined) {
    var userInfo = JSTACK.Keystone.params.access.user;
    var user = new User({
        name: userInfo.name,
        id: userInfo.id
    });
    return user;
});

UTILS.Messages = (function(U, undefined) {
    var getCallbacks;

    getCallbacks = function (successMess, errorMess, options) {

        options = options || {};

        var check = function() {
            if (options) {
                if (options.context) {
                    options.context.close();
                }
                if (options.href) {
                    window.location.href = options.href;
                }
            }
        };

        var opt = {callback: function (resp) {
            check();
            if (options.showSuccessResp) {
                successMess = successMess + resp;
            }
            var subview = new MessagesView({state: "Success", title: successMess, el: options.el});
            subview.render();
            $('body').spin("modal");
            if (options.success) {
                options.success();
            }
        }, error: function (model, error) {
            check();
            var subview = new MessagesView({state: "Error", title: errorMess + ". Cause: " + error.message, info: error.body, el: options.el});
            subview.render();
            $('body').spin("modal");
            if (options.error) {
                options.error();
            }
        }};
        opt.success = opt.callback;

        $('body').spin("modal");

        if (options && options.context) {
            options.context.unbind();
            options.context.undelegateEvents();
        }

        return opt;
    };

    return {
        getCallbacks: getCallbacks
    };
})(UTILS);

UTILS.SM = (function(U, undefined) {
    var check, obj;

    // Private functions
    // -----------------

    // Function `_check` internally confirms that Keystone module is
    // authenticated and it has the URL of the Nova service.
    check = function () {
        if (JSTACK.Keystone !== undefined &&
                JSTACK.Keystone.params.currentstate === JSTACK.Keystone.STATES.AUTHENTICATED) {
            return true;
        }
    };

    obj = {};
    var caller = function (funct) {
        return function() {
            if (!check()) {
                return;
            }
            JSTACK.Nova.params.service = "sm";
            JSTACK.Nova[funct].apply(this, arguments);
            JSTACK.Nova.params.service = "compute";
        };
    };
    for (var func in JSTACK.Nova) {
        if (typeof(JSTACK.Nova[func]) === "function" && func !== "Volume") {
            obj[func] = caller(func);
        }
    }
    console.log(func);

    return obj;
})(UTILS);

UTILS.DragDrop = (function(U, undefined) {
    var setData, getData, obj = {};
    setData = function(key, value) {
        obj[key] = value;
    };
    getData = function(key) {
        return obj[key];
    };
    clear = function() {
        obj = {};
    };
    return {
        setData : setData,
        getData : getData,
        clear   : clear
    };
})(UTILS);
