const otpGenerator = require('otp-generator');
const bcrypt = require('bcrypt');

const User = require('../modal/user.modal')
const helper = require('../helper/helper');

const con = require('../config/db.cofig');
const user = require('../modal/user.modal');

/**
 *URL : http://localhost:8080/api/register
 *  Method : POST
 *  body={
 *  username : "iam_ab",
 *  password : "12345678",
 *  profile : "base64",
 *  email : "abc@gmail.com"
 * }
 *  */
exports.register = async (req, res) => {
    try {
        const { username, password, profile, email } = req.body;
        
        let users = await User.addUser(username, password, profile, email)
        res.status(users.statusCode).json({
            success: users.success,
            message: users.message,
            statusCode: users.statusCode
        })
    } catch (error) {
        return res.status(500).send(error)
    }

}

/**
 *URL : http://localhost:8080/api/login
 *  Method : POST
 *  body={
 *  username : "iam_ab",
 *  password : "12345678",
 * }
 *  */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        let users = await User.login(username, password)   
        res.status(users.statusCode).json({
            success: users.success,
            message: users.message,
            statusCode: users.statusCode,
            token: users.token,
            data: users.data
        })
    } catch (error) {
        return res.status(500).send(error)
    }
}

/**
 *  URL : http://localhost:8080/api/user/:username
 *  Method : GET
 *  Body parms : username
 *  */
exports.getUser = async (req, res) => {
    const { username } = req.params;
    try {

        if (!username) return res.status(501).json({
            statusCode: 501, //501 - required to fulfill the request
            success: false,
            message: "Invalid user name !"
        })
        let query = `SELECT u.id, u.username, u.email, u.profile, u.created_at, u.updated_at, u.deleted_at 
        FROM users AS u
        WHERE u.username = '${username}';`
        con.query(query, (err, result) => {
            if (!err) {
                console.log(result);
                if (result[0].length != 0) {
 
                    res.status(200).json({
                        statusCode: 200,
                        success: true,
                        message: "success",
                        date: [
                            { user: result[0] }
                        ]
                    })
                } else {
                    res.status(400).json({
                        statusCode: 400,
                        success: false,
                        message: "Can't find user "
                    }) 
                }
            } else {
                res.status(500).json({
                    statusCode: 500,
                    success: false,
                    message: err
                })
            }

        })
    } catch (error) {

    }
}
/**updating user */
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.user;
        console.log(userId);
        if (userId) {
            const {firstName,lastName,email,mobile,address, profile } = req.body;
            let emailVarify = await helper.isvalidEmail(email)
            console.log(emailVarify);
            if (emailVarify) {
                let sqlQuery = `SELECT * FROM details d
                                WHERE d.email = '${email}'`
                 con.query(sqlQuery,(err,result)=>{
                    console.log("update",result);
                    if(result.length === 0){
                                let query =`CALL insertUserDetails('${firstName}','${lastName}','${email}','${mobile}','${address}','${profile}')`;
                                con.query(query,(err,result)=>{
                                    if(err) throw err.message
                                    res.status(201).json({
                                        statusCode : 201,
                                        success : true,
                                        message : "Added succefully"
                                    })
                                })
                    }else{
                                            // update the data
                     let query = `UPDATE details d
                     SET d.first_name = '${firstName}' ,d.last_name = '${lastName}', d.mobile = '${mobile}', d.profile = '${profile}', d.address = '${address}' ,d.email = '${email}'
                     WHERE d.email = '${email}'`;
                     con.query(query, (err, result) => {
                                if (!err) {
                                    console.log(result);
                                    res.status(201).json({
                                        statusCode: 201,
                                        success: true,
                                        message: "updated succesfully"
                                    })
                                } else {
                                    res.status(500).json({
                                        statusCode: 500,
                                        success: false,
                                        message: err.message
                                    })
                                }
                            })
                        }
                 })               
              

            } else {

                res.status(400).json({
                    statusCode: 400,
                    success: false,
                    message: "Invalid email !"
                })
            }

        } else {
            console.log("##### userId is not found");
        }
    } catch (err) {

        return res.status(404).json({
            statusCode: 401,//Client request not been compleated
            success: false,
            message: err.message
        })
    }

}

/** generate OTP */
exports.generateOTP = async (req, res) => {
    // Generate otp
    req.app.locals.OTP = await otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false })
    res.status(201).json({
        statusCode: 201,
        success: true,
        message: " OTP generated ",
        code: req.app.locals.OTP
    })

}
/**verify OTP */
exports.verifyOTP = async (req, res) => {
    const { code, username } = req.query;
    if (parseInt(req.app.locals.OTP) === parseInt(code)) {
        req.app.locals.OTP = null //reset the otp value
        req.app.locals.resetSession = true //start session for reset password
        res.status(201).json({
            statusCode: 201,
            success: true,
            message: " Verification succefully "
        })

    } else {
        res.status(400).json({
            statusCode: 400,
            success: false,
            message: " invalid OTP "
        })
    }
}
/** success fully redirect user when OTP is valid */
exports.createResetSession = async (req, res) => {
    try{
        if (req.app.locals.resetSession) {
 
            res.status(201).json({
                statusCode: 201,
                success: true,
                message: " access granted "
            })
        }else{
            res.status(440).json({
                statusCode: 440,
                success: false,
                message: " access denied " 
            })
        }

    }catch(err){
        console.log("ff",err);
        res.status(500).json({
            statusCode: 500,
            success: false,
            message: err.message
        })
    }
  

}
/** update the password when we have valid session */
exports.resetPassword = async (req, res) => {

    try {
   //
   
      if(req.app.locals.resetSession){


            const { username, password } = req.body;
            try {
                let query = `SELECT * FROM users u
                             WHERE u.username = '${username}'`
                con.query(query,(err,result)=>{ 
                    if(result[0] !=0){
                        bcrypt.hash(password, 10)   
                                .then((hash)=>{
                                let query = `UPDATE users u
                                             SET u.password = '${hash}'
                                             WHERE u.username = '${username}'`
                                con.query(query,(err,success)=>{
                                         if(err) throw err.message
                                         req.app.locals.resetSession =false ;
                                         res.status(201).json({
                                            statusCode: 201,
                                            success: false,
                                            message: "Password updated successfully"
                                        })     
                                })
                           }).catch((err)=>{
                            res.status(500).json({
                                statusCode: 500,
                                success: false,
                                message: "Enable to hash password"
                           })               
                     })
    
                    }
                   
    
                })
                
         
    
            } catch(err) {
                res.status(500).json({
                    statusCode: 500,
                    success: false,
                    message: err.message
                })
            }
        }else{
            res.status(440).json({
                statusCode: 440,
                success: false,
                message: "Session expired "
            })
                          
        }
     
    } catch (err) {
        res.status(401).json({
            statusCode: 401,
            success: false,
            message: err.message
        })
    }

} 
 