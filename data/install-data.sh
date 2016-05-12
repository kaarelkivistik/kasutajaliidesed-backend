docker exec kl mongo kl --eval "db.users.drop()"
docker exec kl mongo kl --eval "db.assignments.drop()"
docker exec kl mongo kl --eval "db.submissions.drop()"

cat users.json | docker exec -i kl mongoimport --db kl -c users --jsonArray
cat assignments.json | docker exec -i kl mongoimport --db kl -c assignments --jsonArray
cat submissions.json | docker exec -i kl mongoimport --db kl -c submissions --jsonArray