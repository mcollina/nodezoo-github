'use strict';

var redisIP = process.env.REDIS_IP || 'localhost';
var beanstakIP = process.env.BEANSTALK_IP || 'localhost';
var influxIP = process.env.INFLUX_IP || 'localhost';

require('seneca')()
  .use('redis-transport')
  // disabled as not compatible with seneca 0.6 yet
  //.use('jsonfile-store',{folder:__dirname+'/../data'})
  .use('mem-store',{web:{dump:true}})
  .use('beanstalk-transport')
  .use('../github.js')
  .use('collector', { host: influxIP, database: 'stats', seriesName: 'actions' })
  .add('role:info,req:part',function(args,done){
    done();
    this.act('role:github,cmd:get', {name:args.name}, function(err,mod){
      if (err) { return; }

      if  (mod) {
        this.act('role:info,res:part,part:github', {name:args.name,data:mod.data$()});
      }
      else {
        this.act('role:npm,cmd:get', {name:args.name}, function(err,mod){
          if( err ) { return; }

          if( mod ) {
            this.act('role:github,cmd:get', {name:args.name,giturl:mod.giturl}, function( err, mod ){
              if (err) { return; }
              if (mod) {
                this.act('role:info,res:part,part:github', {name:args.name,data:mod.data$()});
              }
            });
          }
        });
      }
    });
  })
  .listen({host: redisIP, type:'redis',pin:'role:npm,req:part'})
  .client({host: redisIP, type:'redis',pin:'role:github,res:part'})
  .client({host: beanstakIP, port: 1130, type: 'beanstalk', pin: 'role:npm,cmd:*'})
  .listen({host: beanstakIP, port: 1130, type: 'beanstalk', pin: 'role:github,cmd:*'});

