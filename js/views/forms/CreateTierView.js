var CreateTierView = Backbone.View.extend({

    _template: _.itemplate($('#createTierFormTemplate').html()),

    tableView: undefined,
    tableViewNew: undefined,
    netTableView: undefined,
    netTableViewNew: undefined,

    dial: undefined,

    events: {
        'submit #form': 'onCreate',
        'click #cancelBtn': 'close',
        'click .close': 'close',
        'click .modal-backdrop': 'close',
        'change .tier-values': 'onInput',
        'click #cancel-attrs': 'cancelAttrs',
        'click #accept-attrs': 'acceptAttrs',
        'click #btn-apply-icon': 'applyIcon',
        'click #btn-show-networks': 'showNetworks',
        'click #btn-hide-networks': 'hideNetworks',
        'click #addNewAlias': 'addNewAlias'
        
    },

    initialize: function() {
        this.options = this.options || {};
        this.options.roles = new Roles();
        this.options.roles.fetch();

        var self = this;

        this.options.sdcs.getCatalogueListWithReleases({callback: function (resp) {

            self.catalogueList = resp;
            self.tableViewNew.render();

        }, error: function (e) {
            self.catalogueList = [];
            self.tableViewNew.render();
            console.log(e);
        }});

        this.addedProducts = [];
        this.networkList = [];
        var current_tenant_id = JSTACK.Keystone.params.access.token.tenant.id;

        var tiers = this.model.get("tierDtos_asArray");
        var added = {};
        for (var tierIdx in tiers) {
            var tier = tiers[tierIdx];
            if (tier.hasOwnProperty("networkDto_asArray")) {
                var nets = tier.networkDto_asArray;
                for (var netIdx in nets) {
                    var net = nets[netIdx];
                    if (added[net.networkName] === undefined) {
                        this.networkList.push({displayName: net.networkName, name: net.networkName, alias: true /* TODO Check if it is not an alias*/});
                        added[net.networkName] = net;
                    }
                }
            }
        }

        var all_subnets = this.options.subnets.models;
        for (var index in this.options.networks.models) {
            var network = this.options.networks.models[index];
            var tenant_id = network.get("tenant_id");
            var subnets = [];
            var subnet_ids = network.get("subnets");
            if (current_tenant_id == tenant_id && network.get("router:external") !== true) {
                for (var i in subnet_ids) {
                    sub_id = subnet_ids[i];
                    for (var j in all_subnets) {
                        if (sub_id == all_subnets[j].id) {
                            var sub_cidr = all_subnets[j].attributes.name+" "+all_subnets[j].attributes.cidr;
                            subnets.push(sub_cidr);
                        }                                      
                    }                    
                }
                if (subnets.length > 0) {
                    var name = network.attributes.name === "" ? "("+network.get("id").slice(0,8)+")" : network.attributes.name;
                    name = name + " (" + subnets + ")";
                    this.networkList.push({displayName: name, name: network.attributes.name, net_id: network.id});
                }
            }
        }
        
        this.addedNetworks = [];

        this.editing = -1;
    },

    close: function(e) {
        this.onClose();
    },

    onClose: function () {
        $('#create_tier').remove();
        $('.modal-backdrop').remove();
        this.tableView.close();
        this.tableViewNew.close();
        this.netTableView.close();
        this.netTableViewNew.close();
        this.unbind();
        this.undelegateEvents();
    },

    onInput: function() {
        var min = parseInt($('#tier-min-value').val(), 0);
        var max = parseInt($('#tier-max-value').val(), 0);
        var dial = this.dial[0];

        if (min > max) {
            this.$('input[name=tier-max-value]')[0].setCustomValidity("Max value should be greater than min value");
            return;
        } else {
            this.$('input[name=tier-max-value]')[0].setCustomValidity("");
        }

        dial.o.min = min;
        dial.o.max = max;


        if (dial.cv > dial.o.max) {
            dial.cv = dial.o.max;
        } else if (dial.cv < dial.o.min) {
            dial.cv = dial.o.min;
        }
        dial.v = dial.cv;
        dial._draw();
    },

    getNetMainButtons: function() {
        return [];
    },

    getMainButtons: function() {
        // main_buttons: [{label:label, url: #url, action: action_name}]
        return [];
        // [{
        //     label: "Allocate IP to Project",
        //     action: "allocate"
        // }];
    },

    getNetDropdownButtons: function() {
        // dropdown_buttons: [{label:label, action: action_name}]
        var self = this;
        var oneSelected = function(size, id) {
            if (size === 1) {
                return true;
            }
        };
        var groupSelected = function(size, id) {
            if (size >= 1) {
                return true;
            }
        };
        var connected = function(size, id) {
            if (oneSelected(size, id)) {
                return self.addedNetworks[id[0]].connected;
            }
            else {
                return false;
            }
        };
        var disconnected = function(size, id) {
            if (oneSelected(size, id)) {
                return !self.addedNetworks[id[0]].connected;
            }
            else {
                return false;
            }
        };
        return [{
            label: "Connect to Internet",
            action: "connectInternet",
            activatePattern: disconnected
        }, {
            label: "Disconnect from Internet",
            action: "disconnectInternet",
            activatePattern: connected
        }, {
            label: "Remove",
            action: "uninstall",
            activatePattern: groupSelected
        }];
    },

    getDropdownButtons: function() {
        // dropdown_buttons: [{label:label, action: action_name}]
        var self = this;
        var oneSelected = function(size, id) {
            if (size === 1) {
                return true;
            }
        };
        var groupSelected = function(size, id) {
            if (size >= 1) {
                return true;
            }
        };
        return [{
            label: "Remove",
            action: "uninstall",
            activatePattern: groupSelected
        }, {
            label: "Edit Attributes",
            action: "edit",
            activatePattern: oneSelected
        }];
    },

    getNetHeaders: function() {
        return [{
            name: "Name",
            tooltip: "Network name",
            size: "55%",
            hidden_phone: false,
            hidden_tablet: false
        }];
    },

    getHeaders: function() {
        return [{
            name: "Name",
            tooltip: "Software name",
            size: "55%",
            hidden_phone: false,
            hidden_tablet: false
        }];
    },

    getNetEntries: function() {
        var entries = [];

        for (var network in this.addedNetworks) {
            var name = this.addedNetworks[network].displayName;
            if (this.addedNetworks[network].connected) {
                name = name + " <span class='network-connected-internet'></span>";
            }

            entries.push(
                {id: network, cells:[
                    {value: name}
                    ]
                });

        }

        return entries;
    },

    getEntries: function() {
        var entries = [];

        for (var product in this.addedProducts) {

            entries.push(
                {id: product, cells:[
                    {value: this.addedProducts[product].name + ' ' + this.addedProducts[product].version,
                    tooltip: this.addedProducts[product].description}
                    ]
                });

        }

        return entries;
    },

    getNetMainButtonsNew: function() {
        // main_buttons: [{label:label, url: #url, action: action_name}]
        return [];
    },

    getMainButtonsNew: function() {
        // main_buttons: [{label:label, url: #url, action: action_name}]
        return [];
        // [{
        //     label: "Allocate IP to Project",
        //     action: "allocate"
        // }];
    },

    getNetDropdownButtonsNew: function() {
        // dropdown_buttons: [{label:label, action: action_name}]
        var self = this;
        var oneSelected = function(size, id) {
            if (size === 1) {
                return true;
            }
        };
        var groupSelected = function(size, id) {
            if (size >= 1) {
                return true;
            }
        };
        return [{
            label: "Add",
            action: "install",
            activatePattern: groupSelected
        }];
    },

    getDropdownButtonsNew: function() {
        // dropdown_buttons: [{label:label, action: action_name}]
        var self = this;
        var oneSelected = function(size, id) {
            if (size === 1) {
                return true;
            }
        };
        var groupSelected = function(size, id) {
            if (size >= 1) {
                return true;
            }
        };
        return [{
            label: "Add",
            action: "install",
            activatePattern: groupSelected
        }];
    },

    getNetHeadersNew: function() {
        return [{
            name: "Name",
            tooltip: "Network name",
            size: "40%",
            hidden_phone: false,
            hidden_tablet: false
        }];
    },

    getHeadersNew: function() {
        return [{
            name: "Name",
            tooltip: "Software name",
            size: "40%",
            hidden_phone: false,
            hidden_tablet: false
        }];
    },

    getNetEntriesNew: function() {
        var entries = [];

        var networks = this.networkList;

        if (networks === undefined) {
            return 'loading';
        }

        for (var network in networks) {
            var name = networks[network].displayName;
            if (networks[network].connected) {
                name = name + " <span class='network-connected-internet'></span>";
            }
            entries.push(
                {id: network, cells:[
                {value: name}]});

        }

        entries = [{id: networks.length, isDraggable: false, cells:[
                {value: '<input type="text" id="aliasName" placeholder="Enter the alias of a new network..."><button id="addNewAlias">+</button>'}]}].concat(entries);
        return entries;

    },

    getEntriesNew: function() {
        var entries = [];

        var products = this.catalogueList;

        if (products === undefined) {
            return 'loading';
        }

        for (var product in products) {
              entries.push(

                {id: product, cells:[
                {value: products[product].name + ' ' + products[product].version, 
                tooltip: products[product].description}]});

        }
        return entries;

    },

    addNewAlias: function() {
        this.networkList = [{name: $("#aliasName").val(), displayName: $("#aliasName").val()}].concat(this.networkList);
        this.netTableViewNew.render();
    },

    connectNetworkToInternet: function(id, targetId) {
        network = this.addedNetworks[id];
        network.connected = true;
        this.netTableView.render();
        this.netTableViewNew.render();
    },

    disconnectNetworkFromInternet: function(id, targetId) {
        network = this.addedNetworks[id];
        network.connected = false;
        this.netTableView.render();
        this.netTableViewNew.render();
    },

    installSoftware: function(id, targetId) {
        product = this.catalogueList[id];
        console.log(product);
        var exists = false;
        for (var a in this.addedProducts) {
            if (this.addedProducts[a].name === product.name) {
                exists = true;
                continue;
            }
        }
        if (!exists) {
            //this.addedProducts.push(product);
            targetId = targetId || this.addedProducts.length;
            console.log("Installing on: ", targetId);
            this.addedProducts.splice(targetId, 0, product);
            this.tableView.render();
        }
    },

    installNetwork: function(id, targetId) {
        network = this.networkList[id];
        console.log(network);
        var exists = false;
        for (var a in this.addedNetworks) {
            if (this.addedNetworks[a].name === network.name) {
                exists = true;
                continue;
            }
        }
        if (!exists) {
            //this.addedProducts.push(network);
            targetId = targetId || this.addedNetworks.length;
            console.log("Installing on: ", targetId);
            this.addedNetworks.splice(targetId, 0, network);
            this.netTableView.render();
        }
    },

    movingSoftware: function(id, targetId) {
        var product = this.addedProducts[id];
        this.addedProducts.splice(id, 1);
        var offset = 0;
        if (id < targetId) {
            offset = 1;
        }
        targetId = targetId || this.addedProducts.length - offset;
        console.log("Moving to: ", targetId);
        this.addedProducts.splice(targetId, 0, product);
        this.tableView.render();
    },

    movingNetwork: function(id, targetId) {
        var network = this.addedNetworks[id];
        this.addedNetworks.splice(id, 1);
        var offset = 0;
        if (id < targetId) {
            offset = 1;
        }
        targetId = targetId || this.addedNetworks.length - offset;
        console.log("Moving to: ", targetId);
        this.addedNetworks.splice(targetId, 0, network);
        this.netTableView.render();
    },

    uninstallSoftware: function(id) {
        this.addedProducts.splice(id, 1);
        this.tableView.render();
    },

    uninstallNetwork: function(id) {
        this.addedNetworks.splice(id, 1);
        this.netTableView.render();
    },

    showNetworks: function() {
        $('#scroll-based-layer-networks').animate({
            scrollLeft: $('#scroll-based-layer-networks').width()+1
        }, 500, function() {
            // Animation complete.
        });
        $('#btn-show-networks').animate({
            opacity: 0
        }, 500, function() {
            // Animation complete.
            $('#btn-show-networks').hide();
        });
        $('#btn-hide-networks').animate({
            opacity: 1
        }, 500, function() {
            // Animation complete.
            $('#btn-hide-networks').show();
        });
    },

    hideNetworks: function() {
        $('#scroll-based-layer-networks').animate({
            scrollLeft: 0
        }, 500, function() {
            // Animation complete.
        });
        $('#btn-show-networks').animate({
            opacity: 1
        }, 500, function() {
            // Animation complete.
            $('#btn-show-networks').show();
        });
        $('#btn-hide-networks').animate({
            opacity: 0
        }, 500, function() {
            // Animation complete.
            $('#btn-hide-networks').hide();
        });
    },

    onNetAction: function(action, ids) {

        var self = this;

        var product;

        switch (action) {
            case 'connectInternet':
                this.connectNetworkToInternet(ids);
                break;
            case 'disconnectInternet':
                this.disconnectNetworkFromInternet(ids);
                break;
            case 'install':
                this.installNetwork(ids);
            break;
            case 'uninstall':
                this.uninstallNetwork(ids);
            break;
        }
        return false;
    },

    onAction: function(action, ids) {

        var self = this;

        var product;

        switch (action) {
            case 'install':
                this.installSoftware(ids);
            break;
            case 'uninstall':
                this.uninstallSoftware(ids);
            break;
            case 'edit':
                product = this.addedProducts[ids];
                this.edit = ids;
                console.log(product);
                var productAttributes = product.attributes_asArray;
                var str='';
                for (var i in productAttributes) {
                    attr = productAttributes[i];
                    str += '<tr id="sec_groups__row__" class="ajax-update status_down"><td>'+attr.key+'</td><td><input type="text" name="attr_'+i+'" value="'+attr.value+'""></td><td>'+attr.description+'</td></tr>';
                }
                if (str === '') {
                    str = '<tr id="sec_groups__row__" class="ajax-update status_down"><td></td><td style="text-align: center;">No items to display</td><td></td></tr>';

                }
                $('#software-attrs-table').html(str);
                $('#scroll-based-layer').animate({
                    scrollLeft: $('#scroll-based-layer').width()
                }, 500, function() {
                    // Animation complete.
                });
                var effects = {};
                effects["-webkit-filter"] = "blur(1px)";
                effects.opacity = "0.3";
                $('.blurable').animate(effects, 500, function() {
                    $('.blurable').addClass("blur");
                    $('.blurable').bind("click", false);
                });
            break;
        }
        return false;
    },

    attrsDone: function() {
        $('#scroll-based-layer').animate({
            scrollLeft: 0
        }, 500, function() {
            // Animation complete.
        });
        var effects = {};
        effects["-webkit-filter"] = "blur(0px)";
        effects.opacity = "1";
        $('.blurable').animate(effects, 500, function() {
            $('.blurable').removeClass("blur");
            $('.blurable').unbind("click", false);
        });

        if (this.addedProducts[this.edit].attributes_asArray) {

            for (var at in this.addedProducts[this.edit].attributes_asArray) {
                var inp = 'input[name=attr_'+ at+']';
                this.addedProducts[this.edit].attributes_asArray[at].value = this.$(inp).val();
            }
        }
    },

    cancelAttrs: function(evt) {
        evt.preventDefault();
        this.attrsDone();
    },

    acceptAttrs: function(evt) {
        evt.preventDefault();
        this.attrsDone();
    },

    onCreate: function(e){
        var self = this;
        e.preventDefault();
        var name, flavorReg, key_name, image, public_ip, min, max, initial;

        name = this.$('input[name=name]').val();

        flavorReg = $("#id_flavor option:selected")[0].value;

        image = $("#id_image option:selected")[0].value;

        image = $("#id_image option:selected")[0].value;

        icon = this.$('input[name=icon]').val();

        if ($("#id_keypair option:selected")[0].value !== '') {
            key_name = $("#id_keypair option:selected")[0].value;
        }

        region = $("#id_region option:selected")[0].value;

        public_ip = ($('input[name=public_ip]:checked').length > 0);

        min = this.$('input[name=tier-min-value]').val();

        max = this.$('input[name=tier-max-value]').val();

        initial = this.$('input[name=tier-initial-value]').val();

        var tier = {
            name: name,
            flavour: flavorReg,
            floatingip: public_ip,
            image: image,
            icono: icon,
            keypair: key_name,
            region: region,
            minimumNumberInstances: min,
            maximumNumberInstances: max,
            initialNumberInstances: initial
        };

        if (this.addedProducts.length !== 0) {

            tier.productReleaseDtos = [];
            for (var p in this.addedProducts) {
                var nP = {productName: this.addedProducts[p].name, version: this.addedProducts[p].version};
                if (this.addedProducts[p].attributes_asArray) {
                    nP.attributes = [];
                    for (var at in this.addedProducts[p].attributes_asArray) {
                        var inp = 'input[name=attr_'+ this.addedProducts[p].name+'_'+ at+']';
                        var attrib = {key: this.addedProducts[p].attributes_asArray[at].key, value: this.addedProducts[p].attributes_asArray[at].value};
                        nP.attributes.push(attrib);
                    }
                }
                tier.productReleaseDtos.push(nP);
            }
        }

        if (this.addedNetworks.length !== 0) {

            tier.networkDto = [];
            for (var n in this.addedNetworks) {
                var nN = {networkName: this.addedNetworks[n].name};
                if (this.addedNetworks[n].net_id !== undefined) {
                    nN.networkId = this.addedNetworks[n].net_id;
                }
                tier.networkDto.push(nN);
            }
        }

        var options = UTILS.Messages.getCallbacks("Tier "+name + " created.", "Error creating tier "+name, {context: self});

        options.tier = tier;

        var cb2 = options.callback;

        options.callback = function () {
            cb2();
            self.options.callback();
        };

        this.model.addTier(options);
    },

    applyIcon: function() {
        var icon = this.$('input[name=icon]').val();
        if (icon !== "") {
            this.$('#edit-tier-image').attr("src", icon);
            this.$('#edit-tier-image').show();
            this.$('.tier-image-back').hide();
        } else {
            this.$('#edit-tier-image').attr("src", "");
            this.$('#edit-tier-image').hide();
            this.$('.tier-image-back').show();
        }
    },

    onNewNetworkDrag: function(entryId) {
        console.log("Obtained:", entryId);
        return entryId;
    },

    onNewNetworkDrop: function(targetId, entryId) {
        console.log("Uninstalled:", targetId, entryId);
        this.uninstallNetwork(entryId);
    },

    onInstalledNetworkDrop: function(targetId, entryId) {
        console.log("Installing:", targetId, entryId);
        this.installNetwork(entryId, targetId);
    },

    onInstalledNetworkDrag: function(entryId) {
        return entryId;
    },

    onInstalledNetworkMove: function(targetId, entryId) {
        console.log("Moving:", targetId, entryId);
        this.movingNetwork(entryId, targetId);
    },

    onCatalogDrag: function(entryId) {
        console.log("Obtained:", entryId);
        return entryId;
    },

    onCatalogDrop: function(targetId, entryId) {
        console.log("Uninstalled:", targetId, entryId);
        this.uninstallSoftware(entryId);
    },

    onInstalledSoftwareDrop: function(targetId, entryId) {
        console.log("Installing:", targetId, entryId);
        this.installSoftware(entryId, targetId);
    },

    onInstalledSoftwareDrag: function(entryId) {
        return entryId;
    },

    onInstalledSoftwareMove: function(targetId, entryId) {
        console.log("Moving:", targetId, entryId);
        this.movingSoftware(entryId, targetId);
    },

    render: function () {
        if ($('#create_tier').html() !== null) {
            $('#create_tier').remove();
            $('.modal-backdrop').remove();
        }
        $(this.el).append(this._template({model:this.model, flavors: this.options.flavors, keypairs: this.options.keypairs, images: this.options.images, regions: this.options.regions}));
        this.tableView = new TableView({
            el: '#installedSoftware-table',
            actionsClass: "actionsSDCTier",
            headerClass: "headerSDCTier",
            bodyClass: "bodySDCTier",
            footerClass: "footerSDCTier",
            onAction: this.onAction,
            getDropdownButtons: this.getDropdownButtons,
            getMainButtons: this.getMainButtons,
            getHeaders: this.getHeaders,
            getEntries: this.getEntries,
            disableActionButton: true,
            context: this,
            order: false,
            draggable: true,
            dropable: true,
            sortable: true,
            onDrop: this.onInstalledSoftwareDrop,
            onDrag: this.onInstalledSoftwareDrag,
            onMove: this.onInstalledSoftwareMove
        });

        // catalogo
        this.tableViewNew = new TableView({
            el: '#newSoftware-table',
            actionsClass: "actionsSDCTier",
            headerClass: "headerSDCTier",
            bodyClass: "bodySDCTier",
            footerClass: "footerSDCTier",
            onAction: this.onAction,
            getDropdownButtons: this.getDropdownButtonsNew,
            getMainButtons: this.getMainButtonsNew,
            getHeaders: this.getHeadersNew,
            getEntries: this.getEntriesNew,
            disableActionButton: true,
            context: this,
            dropable: true,
            draggable: true,
            onDrag: this.onCatalogDrag,
            onDrop: this.onCatalogDrop
        });
        this.tableView.render();
        this.tableViewNew.render();

        this.netTableView = new TableView({
            el: '#installedNetwork-table',
            actionsClass: "actionsNetTier",
            headerClass: "headerNetTier",
            bodyClass: "bodyNetTier",
            footerClass: "footerNetTier",
            onAction: this.onNetAction,
            getDropdownButtons: this.getNetDropdownButtons,
            getMainButtons: this.getNetMainButtons,
            getHeaders: this.getNetHeaders,
            getEntries: this.getNetEntries,
            disableActionButton: true,
            context: this,
            order: false,
            draggable: true,
            dropable: true,
            sortable: true,
            onDrop: this.onInstalledNetworkDrop,
            onDrag: this.onInstalledNetworkDrag,
            onMove: this.onInstalledNetworkMove
        });

        this.netTableViewNew = new TableView({
            el: '#newNetwork-table',
            actionsClass: "actionsNetTier",
            headerClass: "headerNetTier",
            bodyClass: "bodyNetTier",
            footerClass: "footerNetTier",
            onAction: this.onNetAction,
            getDropdownButtons: this.getNetDropdownButtonsNew,
            getMainButtons: this.getNetMainButtonsNew,
            getHeaders: this.getNetHeadersNew,
            getEntries: this.getNetEntriesNew,
            disableActionButton: true,
            context: this,
            dropable: true,
            draggable: true,
            order: false,
            sortable: false,
            onDrag: this.onNewNetworkDrag,
            onDrop: this.onNewNetworkDrop
        });

        this.netTableView.render();
        this.netTableViewNew.render();
        $('.modal:last').modal();
        this.dial = $(".dial-form").knob();
        return this;
    }

});