odoo.define('hv_scan_product.result_kiosk_mode', function (require) {
"use strict";

var AbstractAction = require('web.AbstractAction');
var ajax = require('web.ajax');
var core = require('web.core');
var Session = require('web.session');

var QWeb = core.qweb;


var ResultKioskMode = AbstractAction.extend({
    events: {
        "click .o_hv_scan_product_button_employees": function() {
            var action = {
                type: 'ir.actions.client',
                name: 'Scan Product',
                tag: 'hv_scan_product_kiosk_mode',
                scan: '1',
            };
            this.do_action(action);
        },
    },
    init: function (parent, action) {
        this._super.apply(this, arguments);
        this.result = action.result;
    },
    start: function () {
        var self = this;
        // core.bus.on('barcode_scanned', this, this._onBarcodeScanned);
        self.session = Session;
        var def = this._rpc({
                model: 'product.product',
                method: 'search_read',
                args: [['|', ['barcode', '=', self.result], ['default_code', '=', self.result]],['name','id', 'list_price', 'description']]
            })
            .then(function (product){
                if (product.length == 0 ){
                    self.get_message();
                    return;
                }
                self.product_id = product[0].id;
                self.product_name = product[0].name;
                self.product_price = product[0].list_price ? product[0].list_price : "";
                self.product_description = product[0].description ? product[0].description : "";
                self.product_image = self.session.url('/web/image', {model: 'product.product', id: self.product_id, field: 'image_128',});
                self.$el.html(QWeb.render("ProductResultKioskMode", {widget: self}));
                // self.start_clock();
            });
        // Make a RPC call every day to keep the session alive
        self._interval = window.setInterval(this._callServer.bind(this), (60*60*1000*24));
        return Promise.all([def, this._super.apply(this, arguments)]);
    },

    get_message: function() {
        var self = this;
        this._rpc({
            route: '/get/message',
        }).then(function (message){
            alert(message.notify_error);
            var action = {
                    type: 'ir.actions.client',
                    name: 'Scan Product',
                    tag: 'hv_scan_product_kiosk_mode',
                    scan: '1',
                };
            self.do_action(action);
        });
    },

    start_clock: function() {
        this.clock_start = setInterval(function() {this.$(".o_hv_scan_product_clock").text(new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit', second:'2-digit'}));}, 500);
        // First clock refresh before interval to avoid delay
        this.$(".o_hv_scan_product_clock").show().text(new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit', second:'2-digit'}));
    },

    destroy: function () {
        // core.bus.off('barcode_scanned', this, this._onBarcodeScanned);
        clearInterval(this.clock_start);
        clearInterval(this._interval);
        this._super.apply(this, arguments);
    },

    _callServer: function () {
        // Make a call to the database to avoid the auto close of the session
        return ajax.rpc("/hv_scan_product/kiosk_keepalive", {});
    },

});

core.action_registry.add('hv_scan_product_result_kiosk_mode', ResultKioskMode);

return ResultKioskMode;

});
