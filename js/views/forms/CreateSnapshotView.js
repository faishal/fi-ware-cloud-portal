var CreateSnapshotView = Backbone.View.extend({

    _template: _.itemplate($('#createSnapshotFormTemplate').html()),

    events: {
      'click #cancelBtn': 'close',
      'click #close': 'close',
      'submit #form': 'update',
      'click .modal-backdrop': 'close'
    },

    initialize: function() {
    },

    render: function () {
        if ($('#create_snapshot').html() != null) {
            return;
        }
        $(this.el).append(this._template({model:this.model}));
        $('.modal:last').modal();
        return this;
    },

    close: function(e) {
        this.model.unbind("change", this.render, this);
        $('#create_snapshot').remove();
        $('.modal-backdrop').remove();
    },

    update: function(e) {
        var name = $('input[name=snapshot_name]').val();
        this.model.createimage(name);
        var subview = new MessagesView({state: "Success", title: "Snapshot "+name+" created."});
        subview.render();
        this.close();
    }

});