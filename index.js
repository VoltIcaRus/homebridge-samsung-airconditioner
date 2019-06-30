var Service, Characteristic;
var exec2 = require("child_process").exec;
var response;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    //UUIDGen = homebridge.hap.uuid;
    homebridge.registerAccessory('homebridge-samsung-airconditioner', 'SamsungAirconditioner', SamsungAirco);
}

function SamsungAirco(log, config) {
    this.log = log;
    this.name = config["name"];
    this.ip = config["ip"];
    this.token = config["token"];
    this.patchCert = config["patchCert"];
    this.accessoryName = config["name"];
    this.setOn = true;
    this.setOff = false;
}

SamsungAirco.prototype = {

    execRequest: function(str, body, callback) {
        exec2(str, function(error, stdout, stderr) {
            callback(error, stdout, stderr)
        })
        //return stdout;
    },
    identify: function(callback) {
        this.log("장치 확인됨");
        callback(); // success
    },

    getServices: function() {

        //var uuid;
        //uuid = UUIDGen.generate(this.accessoryName);
        this.aircoSamsung = new Service.HeaterCooler(this.name);

        //전원 설정
        this.aircoSamsung.getCharacteristic(Characteristic.Active)
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this)); //On  or Off

        //현재 온도
        this.aircoSamsung.getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({
                minValue: 0,
                maxValue: 100,
                minStep: 0.01
            })
            .on('get', this.getCurrentTemperature.bind(this));

        //현재 모드 설정
        this.aircoSamsung.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .on('set', this.setCurrentHeaterCoolerState.bind(this));
   
        //현재 모드 확인
        this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on('get', this.getCurrentHeaterCoolerState.bind(this));

        //냉방모드 온도
        this.aircoSamsung.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getHeatingUpOrDwTemperature.bind(this))
            .on('set', this.setHeatingUpOrDwTemperature.bind(this));

        //난방모드 온도        
         this.aircoSamsung.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getHeatingUpOrDwTemperature.bind(this))
            .on('set', this.setHeatingUpOrDwTemperature.bind(this)); 
        
        //스윙모드 설정
        this.aircoSamsung.getCharacteristic(Characteristic.SwingMode)
            .on('get', this.getSwingMode.bind(this))
            .on('set', this.setSwingMode.bind(this));  

        var informationService = new Service.AccessoryInformation();

        return [informationService, this.aircoSamsung];
    },

    //services


    getHeatingUpOrDwTemperature: function(callback) {
        var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Temperatures[0].desired\'';

        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = parseInt(stdout);
                this.log(stdout);
                this.log("희망온도 확인 : " + body);

                callback(null, body);
                //callback();
            }
        }.bind(this))
        //callback(null, null);
    },

    setHeatingUpOrDwTemperature: function(temp, callback) {
        var body;

        str = 'curl -X PUT -d \'{"desired": ' + temp + '}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/temperatures/0';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
            	this.log("희망온도 설정 : " + body);
                this.log(stdout);
                callback(null, temp);
                //callback();
            }
        }.bind(this));
    },
    
    getCurrentTemperature: function(callback) {
        var body;

        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Temperatures[0].current\'';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                //callback();
                this.log(stdout);
                body = parseInt(stdout);
                this.log("현재온도: " + body);
                this.aircoSamsung.getCharacteristic(Characteristic.CurrentTemperature).updateValue(body);
            }
            callback(null, body); //Mettere qui ritorno di stdout? o solo callback()
        }.bind(this));

    },
    
    getSwingMode: function(callback) {
        var body;
        
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Mode.options[1]\'';

        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                this.log('Power function failed', stderr);
                callback(error);
            } else {
                this.log('Power function OK');
                this.log(stdout);
                this.response = stdout;
                this.response = this.response.substr(1, this.response.length - 3);
                this.log(this.response);
                //callback();

            }
            if (this.response == "Comode_Off") {
                callback(null, Characteristic.SwingMode.SWING_DISABLED);
                this.log(this.response + "무풍모드해제 설정됨");
            } else if (this.response == "Comode_Nano") {
                this.log("무풍모드 설정됨");
                callback(null, Characteristic.SwingMode.SWING_ENABLED);
            } else {
                this.log(this.response + "무풍모드 설정 오류");
            }
        }.bind(this));

    },
    
    
    setSwingMode: function(state, callback) {
        var body;
        var token, ip, patchCert;
        token = this.token;
        ip = this.ip;
        patchCert = this.patchCert;

        this.log("SwingMode");
        this.log(state);
        this.log(ip);
        var activeFuncion = function(state) {
            if (state == Characteristic.SwingMode.SWING_ENABLED) {
               str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" --cert ' + patchCert + ' --insecure -X PUT -d \'{"options": ["Comode_Nano"]}\' https://' + ip + ':8888/devices/0/mode';
                console.log("무풍모드");
                 } 
             else if (state == Characteristic.SwingMode.SWING_DISABLED) {
                str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" --cert ' + patchCert + ' --insecure -X PUT -d \'{"options": ["Comode_Off"]}\' https://' + ip + ':8888/devices/0/mode';
                console.log("무풍모드해제");
                 } 
            else {
                console.log("무풍모드 오류");
            }
        }
        activeFuncion(state);
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                this.log('Power function failed', stderr);
            } else {
                this.log('Power function OK');
                //callback();
                this.log(stdout);
            }
        }.bind(this));
        callback();
    },
    
    
    getActive: function(callback) {
        var body;
        var OFForON;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Operation.power\'';

        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                this.log('Power function failed', stderr);
                callback(error);
            } else {
                this.log('Power function OK');
                this.log(stdout);
                this.response = stdout;
                this.response = this.response.substr(1, this.response.length - 3);
                this.log(this.response);
                //callback();

            }
            if (this.response == "Off") {
                callback(null, Characteristic.Active.INACTIVE);
            } else if (this.response == "On") {
                this.log("연결됨");
                callback(null, Characteristic.Active.ACTIVE);
            } else {
                this.log(this.response + "연결안됨");
            }
        }.bind(this));

    },

    setActive: function(state, callback) {
        var body;
        var token, ip, patchCert;
        token = this.token;
        ip = this.ip;
        patchCert = this.patchCert;

        this.log("COSA E");
        this.log(state);
        this.log(ip);
        var activeFuncion = function(state) {
            if (state == Characteristic.Active.ACTIVE) {
                str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" --cert ' + patchCert + ' --insecure -X PUT -d \'{"Operation" : {\"power"\ : \"On"\}}\' https://' + ip + ':8888/devices/0';
                console.log("켜짐");
            } else {
                console.log("꺼짐");
                str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" --cert ' + patchCert + ' --insecure -X PUT -d \'{"Operation" : {\"power"\ : \"Off"\}}\' https://' + ip + ':8888/devices/0';
            }
        }
        activeFuncion(state);
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                this.log('Power function failed', stderr);
            } else {
                this.log('Power function OK');
                //callback();
                this.log(stdout);
            }
        }.bind(this));
        callback();
    },

    setPowerState: function(powerOn, callback) {
        var body;
        var str;
        this.log("Il clima per ora è ");

        if (powerOn) {
            body = this.setOn
            this.log("켜짐");
            str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X PUT -d \'{"Operation" : {\"power"\ : \"On"\}}\' https://' + this.ip + ':8888/devices/0';

        } else {
            body = this.setOff;
            this.log("꺼짐");
            str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X PUT -d \'{"Operation" : {\"power"\ : \"Off"\}}\' https://' + this.ip + ':8888/devices/0';

        }
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                this.log('Power function failed', stderr);
                callback(error);
            } else {
                this.log('Power function OK');
                callback();
                this.log(stdout);
            }
        }.bind(this));
    },

    getModalita: function(callback) {
        var str;
        //var response;
        var body;
        this.log("Mettere modalita");
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Mode.modes[0]\'';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                this.log('Power function failed', stderr);
                callback(error);
            } else {
                this.log('Power function OK');
                this.log(stdout);
                this.response = stdout;
                this.response = this.response.substr(1, this.response.length - 3);
                this.log(this.response);
                callback();
            }

            if (this.response == "CoolClean" || this.response == "Cool") {
                this.log("냉방청정모드");
                Characteristic.TargetHeaterCoolerState.COOL;
            } else if (this.response == "DryClean" || this.response == "Dry") {
                this.log("제습청정모드");
                Characteristic.TargetHeaterCoolerState.HEAT;
            } else if (this.response == "Auto" || this.response == "Wind") {
                this.log("스마트쾌적모드");
                Characteristic.TargetHeaterCoolerState.AUTO;
            } else {
                this.log(this.response + "는 설정에 없는 모드입니다.");
            }

        }.bind(this));

    },
    setModalita: function(state, callback) {

        switch (state) {

            case Characteristic.TargetHeaterCoolerState.AUTO:
                var body;
                this.log("스마트쾌적모드를 설정합니다")
                str = 'curl -X PUT -d \'{"modes": ["Auto"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        this.log('Power function failed', stderr);
                        callback(error);
                    } else {
                        this.log('Power function OK');
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;

            case Characteristic.TargetHeaterCoolerState.HEAT:
                var body;
                this.log("제습청정모드로 설정합니다")
                str = 'curl -X PUT -d \'{"modes": ["DryClean"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        this.log('Power function failed', stderr);
                        callback(error);
                    } else {
                        this.log('Power function OK');
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;
                
            case Characteristic.TargetHeaterCoolerState.COOL:
                var body;
                this.log("냉방청정모드를 설정합니다")
                str = 'curl -X PUT -d \'{"modes": ["CoolClean"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        this.log('Power function failed', stderr);
                        callback(error);
                    } else {
                        this.log('Power function OK');
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;
        }
    }
}
