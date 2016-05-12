const { MongoClient, ObjectID: { createFromHexString: oid } } = require("mongodb");
const express = require("express");
const { json } = require("body-parser");
const Promise = require("promise");
const cors = require("cors");

const dbUrl = "mongodb://docker:27027/kl";

const api = express(); 

api.use(cors());
api.use(json());

let db, assignments, submissions, users;

console.log("Connecting to %s", dbUrl);

MongoClient.connect(dbUrl).then(result => {
	console.log("Connected to %s", dbUrl);
	
	db = result;
	
	assignments = db.collection("assignments");
	submissions = db.collection("submissions");
	users = db.collection("users");
	
	users.ensureIndex("name", {
		unique: true
	});
	
	submissions.ensureIndex("authorId");
	submissions.ensureIndex("assignmentId");
	
	api.listen(1080);
}, error => {
	console.error("Unable to connect to %s", dbUrl);
	console.error(error);
});


api.get("/students", (req, res) => {
	users.find({
		student: true
	}, {
		name: true
	}).toArray().then(result => {
		res.send(result);
	}, error => {
		res.status(500).send(error);
	});
});

api.get("/students/:studentId/submissions", (req, res) => {
	const { studentId } = req.params;
	
	try {
		Promise.all([assignments.find().toArray(), submissions.find({
			authorId: oid(studentId)
		}).toArray()]).then(result => {
			const [assignments, submissions] = result;
			
			const submissionsMap = {};
			
			submissions.forEach(submission => {
				submissionsMap[submission.assignmentId.toHexString()] = submission;
			});
			
			assignmentsWithSubmissions = assignments.map(assignment => {
				return Object.assign({}, assignment, {
					submission: submissionsMap[assignment._id.toHexString()]
				});
			});
			
			res.send(assignmentsWithSubmissions);
		}, result => {
			res.status(500).end()
		}).catch(e => {
			console.log(e)
			
			res.status(500).end();
		});
	} catch(e) {
		res.status(400).end();
	}
});


api.post("/users", (req, res) => {
	const { name, password, student, teacher } = req.body;
	
	users.insertOne({
		name, password, student, teacher
	}).then(result => {
		res.send(result.insertedId);
	}, error => {
		res.status(500).send(error);
	});
});

api.post("/auth", (req, res) => {
	const { name, password } = req.body;
	
	users.findOne({
		name, password
	}, {
		name: true,
		student: true,
		teacher: true
	}).then(result => {
		if(result)
			res.send(result);
		else
			res.status(403).end();
	}, error => {
		res.status(500).send(error);
	});
});


api.put("/assignments/:id", (req, res) => {
	const { id } = req.params;	
	const { isOpen, isGraded } = req.body;
	
	assignments.findOneAndUpdate({
		_id: oid(id)
	}, {
		$set: {
			isOpen, isGraded
		}
	}).then(result => {
		res.end();
	}, error => {
		res.status(500).send(error);
	});
});

api.get("/assignments", (req, res) => {
	assignments.find().toArray().then(result => {
		res.send(result);
	}, error => {
		res.status(500).send(error);
	});
});

api.get("/assignments/:id", (req, res) => {
	const { id } = req.params;
	
	assignments.findOne({
		_id: oid(id)
	}).then(result => {
		res.send(result);
	}, error => {
		res.status(500).send(error);
	});
});

api.get("/assignments/:assignmentId/student/:studentId", (req, res) => {
	const { assignmentId, studentId } = req.params;
	
	try {
		Promise.all([assignments.findOne({
			_id: oid(assignmentId)
		}), submissions.findOne({
			assignmentId: oid(assignmentId),
			authorId: oid(studentId)
		})]).then(result => {
			const [assignment, submission] = result;
			
			assignment.submission = submission;
			
			res.send(assignment);
		}, error => {
			res.status(500).send(error);
		});
	} catch(e) {
		res.status(500).end();
	}
});

api.get("/assignments/:id/submissions", (req, res) => {
	const { id } = req.params;
	
	Promise.all([assignments.findOne({
		_id: oid(id)
	}), users.find({
		student: true
	}, {
		name: true
	}).toArray(), submissions.find({
		assignmentId: oid(id)
	}).toArray()]).then(result => {
		const [assignment, users, submissions] = result;
		
		const submissionsMap = {};
		
		submissions.forEach(submission => {
			submissionsMap[submission.authorId] = submission;
		});
		
		const usersWithSubmissions = users.map(user => {
			user.submission = submissionsMap[user._id];
			
			return user;
		});
		
		assignment.users = usersWithSubmissions;
		
		res.send(assignment);
	}, () => {
		res.status(500).end();
	});
});

/*api.get("/assignments/:assignmentId/submissions/:submissionId", (req, res) => {
	const { assignmentId, submissionId } = req.params;
	
	console.log({assignmentId, submissionId});
	
	try {
		Promise.all([assignments.findOne({
			_id: oid(assignmentId)
		}), submissions.findOne({
			submissionId: oid(submissionId)
		})]).then(result => {
			const [assignment, submission] = result;
			
			const { authorId } = submission;
			
			users.findOne({
				_id: authorId
			}).then(result => {
				assignment.user = result;
				assignment.submission = submission;
				
				res.send(assignment);
			}, error => {
				res.status(500).send(error);
			});
		}, () => {
			res.status(500).end();
		});
	} catch(e) {
		res.status(400).end();
	}
});*/


api.post("/submissions", (req, res) => {
	const { authorId, assignmentId } = req.body;
	
	const submission = {
		authorId: oid(authorId), 
		assignmentId: oid(assignmentId), 
		submitted: new Date()
	};
	
	submissions.insertOne(submission).then(result => {
		res.send(result.insertedId);
	}, error => {
		res.status(500).send(error);
	});
});

api.put("/submissions/:id", (req, res) => {
	const { id } = req.params;	
	const { properties, graded, comment } = req.body;
	
	submissions.findOneAndUpdate({
		_id: oid(id)
	}, {
		$set: {
			properties, graded, comment
		}
	}).then(result => {
		res.end();
	}, error => {
		res.status(500).send(error);
	});
});


api.get("/submissions/:id", (req, res) => {
	const { id } = req.params;
	
	try {
		submissions.aggregate([{
			$match: {
				_id: oid(id)
			}
		}, {
			$lookup: {
				from: "users",
				localField: "authorId",
				foreignField: "_id",
				as: "author"
			}
		}, {
			$lookup: {
				from: "assignments",
				localField: "assignmentId",
				foreignField: "_id",
				as: "assignment"
			}
		}, {
			$unwind: "$author"
		}, {
			$unwind: "$assignment"
		}]).toArray().then(result => {
			const [assignment] = result;
			
			if(assignment)
				res.send(assignment);
			else
				result.status(404).end();
		}, error => {
			res.status(500).send(error);
		});
	} catch(e) {
		res.status(400).end();
	}
});


