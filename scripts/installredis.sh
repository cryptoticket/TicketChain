#!/bin/bash

wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
sudo make install

#sudo cp redis-server /usr/local/bin/
#sudo cp redis-cli /usr/local/bin/

sudo mkdir /etc/redis
sudo mkdir /var/redis
sudo mkdir /var/redis/6379

sudo cp redis_6379 /etc/init.d/
#sudo vi /etc/init.d/redis_6379

# This is a required step
sudo cp redis_6379_default.conf /etc/redis/6379.conf
#sudo cp redis.conf /etc/redis/6379.conf

sudo update-rc.d redis_6379 defaults
sudo /etc/init.d/redis_6379 start

rm -rf redis-stable*
