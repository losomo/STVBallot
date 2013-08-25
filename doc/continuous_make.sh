while : 
    do if [ "$A" != "`stat -c '%Y'  $1`" ]
        then 
            make `basename $1 .md`.html
            A=`stat -c '%Y' $1`
        fi
        sleep 2
    done
