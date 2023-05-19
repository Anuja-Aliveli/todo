const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dateFns = require("date-fns");

const dbPath = path.join(__dirname, "todoApplication.db");
const app = express();
app.use(express.json());

let db = null;

// initialize server 
const initializeAndConnect = async() => {
    try {
        db = await open({filename: dbPath, driver: sqlite3.Database,});
        app.listen(3000, () => {
            console.log("server running at http://localhost:3000");
            console.log("Database sqlite connected");
        });
    } catch(err) {
        console.log(`Db error: ${err.message}`);
        process.exit(1);
    }  
};
initializeAndConnect();

// is checked invalid 
const isCheckInvalid = (details,response) => {
    const {status, priority, category, dueDate} = details;
    const statusArray = ["TO DO", "IN PROGRESS", "DONE", undefined];
    const priorityArray = ["HIGH","MEDIUM","LOW",undefined];
    const categoryArray = ["WORK", "HOME", "LEARNING", undefined];
    let checkDate = undefined;
    let check = true;    
    if (dueDate !== undefined) {
        const isValid = require('date-fns/isValid');
        checkDate = isValid(new Date(dueDate));
    }
    if(statusArray.includes(status) === false) {
        check = false;
        response.status(400);
        response.send("Invalid Todo Status");
    } else if(priorityArray.includes(priority) === false) {
        check = false;
        response.status(400);
        response.send("Invalid Todo Priority");
    } else if(categoryArray.includes(category) === false) {
        check = false;
        response.status(400);
        response.send("Invalid Todo Category");
    } else if(checkDate === false) {
        check = false;
        response.status(400);
        response.send("Invalid Due Date");
    }
    if(check === true) {
        return true;
    }
};

// format date 
const formatDate = (dueDate) => {
   let format = require('date-fns/format');
   const formattedDate = format(new Date(dueDate), 'yyyy-MM-dd');
   return formattedDate;
};

// convert case 
const convertCase = (array) => {
    for(let each of array) {
        let dueDate = each.due_date;
        delete each.due_date;
        each.dueDate = dueDate;
    }
    return array;
};

// API 1 
app.get("/todos/", async(request, response) => {
    const todoDetails = request.query;
    const check = isCheckInvalid(todoDetails,response);
    if(check === true) {
    const {status, priority, search_q, category} = todoDetails;
    let string = "";
    for(let key in todoDetails) {
        let col = key;
        if(key === "search_q") {
            col = "todo";
        }
        if (todoDetails[key] !== undefined) {
            if(string === "") {
                string += ` ${col} like '%${todoDetails[key]}%'`;
            } else {
                string += ` AND ${col} like '%${todoDetails[key]}%'`;
            }
        }
    }
    const query1 = `select * from todo where` + string + ";";
    const query1Array = await db.all(query1);
    const resultArray = convertCase(query1Array);
    response.send(resultArray);
    }
});

// API 2 
app.get("/todos/:todoId/",  async (request, response) => {
    const { todoId } = request.params;
    const query2 = `select * from todo where id = ${todoId};`;
    const responseQuery2 = await db.get(query2);
    const dueDate = responseQuery2.due_date;
    delete responseQuery2.due_date;
    responseQuery2.dueDate = dueDate;
    response.send(responseQuery2);
});

// API 3 
app.get("/agenda/", async (request, response) => {
    const agendaDetails = request.query;
    const {date} = agendaDetails;
    delete agendaDetails.date;
    agendaDetails.dueDate = date;    
    const check = isCheckInvalid(agendaDetails,response);
    if(check === true) {
    const myDate = formatDate(date);
    //console.log(dueDate);
    const query3 = `select * from todo where due_date = '${myDate}';`;
    const responseQuery3 = await db.all(query3);
    const resultArray = convertCase(responseQuery3);
    response.send(resultArray);
    }
});

// API 4 
app.post("/todos/", async(request, response) => {
    const todoDetails = request.body;
    const check = isCheckInvalid(todoDetails,response);
    if(check === true) {
        const {id, todo, priority, status, category, dueDate} = todoDetails;
        const query4 = `insert into todo(id,todo,priority,status,category,due_date)
        values(${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
        const responseQuery4 = await db.run(query4);
        response.send("Todo Successfully Added");
     }
});

// API 5 
app.put("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;    
    const updateDetails = request.body;
    const check = isCheckInvalid(updateDetails,response);
    if (check === true) {
    const { status, priority, todo, category, dueDate } = updateDetails;
    if(dueDate !== undefined) {
        const date = formatDate(dueDate);
        delete updateDetails.dueDate
        updateDetails.due_date = date;
    }
    let responseMsg = "";    
    let string = "";
    for(let key in updateDetails) {
        if (updateDetails[key] !== undefined) {
            responseMsg = key.charAt(0).toUpperCase() + key.slice(1);
            if(string === "") {
                string += `${key} = '${updateDetails[key]}'`;
            } else {
                string += `, ${key} = '${updateDetails[key]}'`;
            }
        }
    }
    if(responseMsg === "Due_date") {
        responseMsg = "Due Date";
    }
    const query5 = `update todo set ` + string + ` where id = ${todoId};`;
    // console.log(string);
    const responseQuery5 = await db.run(query5);
    response.send(responseMsg + " Updated");
    }
});

// API 6
app.delete("/todos/:todoId", async(request, response) => {
    const { todoId } = request.params;
    const query6 = `delete from todo where id = ${todoId};`;
    await db.run(query6);
    response.send("Todo Deleted");
});

module.exports = app;