var DownloadKeypairView = Backbone.View.extend({

    _template: _.itemplate($('#downloadKeypairFormTemplate').html()),

    initialize: function() {
        this.model.unbind("sync");
        this.model.bind("sync", this.render, this);
    },

    events: {
      'click #cancelCreateBtn': 'close',
      'click #close': 'close'
     // 'click .downloadKeypair': 'downloadKeypair'
    },

    render: function () {
        $(this.el).html(this._template({model:this.model}));
        this.createKeypair();
        return this;
    },

    createKeypair: function(e) {
        var name = this.model.attributes.name;
        var mySuccess = function(object) {
            console.log("Success");
            var privateKey = object.keypair.private_key;
            console.log(object.keypair.public_key);
            var blob, blobURL;
            blob = new Blob([privateKey], { type: "application/x-pem-file" });
            blobURL = window.URL.createObjectURL(blob);

            //window.open(blobURL, 'Save Keypair','width=0,height=0');

            $('.downloadKeypair').append("Download Keypair");
            $('.downloadKeypair').attr("href", blobURL);
            $('.downloadKeypair').attr("download", name+'.pem');

            var subview = new MessagesView({state: "Success", title: "Keypair "+name+" created."});
            subview.render();
        };
        JSTACK.Nova.createkeypair(name, undefined, mySuccess);
    },

    close: function(e) {
        //window.close();
        this.onClose();
    },

    onClose: function () {
        this.undelegateEvents();
        this.unbind();
    }
});