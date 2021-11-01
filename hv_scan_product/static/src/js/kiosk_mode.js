odoo.define('hv_scan_product.kiosk_mode', function (require) {
"use strict";

var AbstractAction = require('web.AbstractAction');
var ajax = require('web.ajax');
var core = require('web.core');
var Session = require('web.session');

var QWeb = core.qweb;


var KioskMode = AbstractAction.extend({
    init: function (parent, action) {
        this._super.apply(this, arguments);
        this.scan = action.scan;
    },
    start: function () {
        var self = this, video, canvas, context, localized, wcstream, scanstart, wclive, videoSelect;
        self.session = Session;
        var def = this._rpc({
                model: 'res.company',
                method: 'search_read',
                args: [[['id', '=', this.session.company_id]], ['name']],
            })
            .then(function (companies){
                self.company_name = companies[0].name;
                self.company_image_url = self.session.url('/web/image', {model: 'res.company', id: self.session.company_id, field: 'logo',});
                self.$el.html(QWeb.render("ProductScanKioskMode", {widget: self}));
                $('canvas').ready(function() {
                    init_webcam()
                    if (self.scan == '1'){
                        Decode()
                    }
                    $('#scan_button').on('click', function(){
                        Decode();
                    }); 
                });
                var init_webcam = function(){
                    try {
                        localized = [];
                        wcstream = undefined;
                        wclive = false;
                        scanstart = false;
                        BarcodeReader.StreamCallback = function(result) {
                            if (result.length > 0) {
                                var tempArray = [];
                                for (var i = 0; i < result.length; i++) {
                                    tempArray.push(result[i].Value);
                                }
                                StopDecode()
                                var action = {
                                    type: 'ir.actions.client',
                                    name: 'Scan Result',
                                    tag: 'hv_scan_product_result_kiosk_mode',
                                    result: tempArray[0],
                                };
                                self.do_action(action);
                            }
                        };
                        BarcodeReader.SetLocalizationCallback(function(result) {
                            localized = result;
                        });
                        BarcodeReader.SwitchLocalizationFeedback(true);
                        video = document.createElement('video');
                        video.width=640;
                        video.height=480;
                        canvas = document.getElementById('canvas');
                        context = canvas.getContext("2d");
                        canvas.width = 320;
                        canvas.height = 240;
                        context.translate(canvas.width, 0);
                        context.scale(-1,1);
                        video.setAttribute('autoplay', '');
                        video.setAttribute('muted', '');
                        video.setAttribute('playsinline', '');
                    } catch (err) {
                        alert(err.name + ": " + err.message);
                    }      
                };
                var attach = function() {
                    if (navigator.mediaDevices === undefined) {
                      navigator.mediaDevices = {};
                    }
                    if (navigator.mediaDevices.getUserMedia === undefined) {
                      navigator.mediaDevices.getUserMedia = function(constraints) {
                        var getUserMedia =  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

                        if (!getUserMedia) {
                          return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
                        }
                        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
                        return new Promise(function(resolve, reject) {
                          getUserMedia.call(navigator, constraints, resolve, reject);
                        });
                      }
                    }
                    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
                    .then(stream => { 
                        stream.getTracks().forEach(t=>t.stop());
                        return navigator.mediaDevices.enumerateDevices()
                    }).then(devices => {
                        var videoDevices = [0,0];
                        var videoDeviceIndex = 0;
                        devices.forEach(function(device) {
                            if (device.kind == "videoinput") {  
                                videoDevices[videoDeviceIndex++] =  device.deviceId;    
                            }
                        });
                        if (videoDevices[1] !== 0) {
                            canvas.style.transform = "scaleX(-1)";
                            return navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: videoDevices[1] } } });
                        }else{
                            canvas.style.transform = "scaleX(1)";
                            return navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: videoDevices[0] } } });
                        }
                    }).then(stream => {
                        if ("srcObject" in video) {
                            video.srcObject = stream;
                        } else {
                            video.src = window.URL.createObjectURL(stream);
                        }
                        video.onloadedmetadata = function(e) {
                            video.play();
                            wcstream = stream;
                            wclive =true;
                            requestAnimationFrame(FFResize);
                        }; 
                    }).catch(function(err) {
                            alert(err.name + ": " + err.message);
                    }); 
                };
                var FFResize = function() {
                    try {
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        if (scanstart==true){
                            BarcodeReader.DecodeStream(video);
                            scanstart=false
                        }
                        if (wclive){
                            setTimeout(function() {
                            requestAnimationFrame(FFResize)
                            }, 100);
                        }
                    } catch (err) {
                        if (e.name == "NS_ERROR_NOT_AVAILABLE") {
                            if (wclive){
                                setTimeout(function() {
                                requestAnimationFrame(FFResize)
                                }, 100);
                            }
                        } else {
                            alert(err.name + ": " + err.message);;
                        }
                    }
                };
                var Decode = function () {
                    if (wclive) return;
                    attach();
                    BarcodeReader.Init();
                    scanstart = true;
                };
                var StopDecode = function () {
                    wclive = false
                    BarcodeReader.StopStreamDecode();
                    localized=[];
                    try{
                        wcstream.getVideoTracks()[0].stop();
                    }catch(err){
                        alert(err.name + ": " + err.message);;
                    }
                };
            });
        // Make a RPC call every day to keep the session alive
        // self._interval = window.setInterval(this._callServer.bind(this), (60*60*1000*24));
        // self.start_clock();
        return Promise.all([def, this._super.apply(this, arguments)]);
    },

    // start_clock: function() {
    //     this.clock_start = setInterval(function() {this.$(".o_hv_scan_product_clock").text(new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit', second:'2-digit'}));}, 500);
    //     // First clock refresh before interval to avoid delay
    //     this.$(".o_hv_scan_product_clock").show().text(new Date().toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit', second:'2-digit'}));
    // },

    destroy: function () {
        // core.bus.off('barcode_scanned', this, this._onBarcodeScanned);
        // clearInterval(this.clock_start);
        // clearInterval(this._interval);
        this._super.apply(this, arguments);
        try{
            wclive=false;
            wcstream.getVideoTracks()[0].stop();
        }catch(e){};
    },

    _callServer: function () {
        // Make a call to the database to avoid the auto close of the session
        return ajax.rpc("/hv_scan_product/kiosk_keepalive", {});
    },

});

core.action_registry.add('hv_scan_product_kiosk_mode', KioskMode);

return KioskMode;

});
