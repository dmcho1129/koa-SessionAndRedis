const User = require('models/user');
const { ObjectId } = require('mongoose').Types;
const crypto = require('crypto');

const cryptoPbkdf2Sync = (password) => {
    let key = crypto.pbkdf2Sync(password, 'salt', 777777, 64, 'sha512');
    return key.toString('base64');
}

exports.join = async (ctx) => {
    const { name, email, password } = ctx.request.body;
    
    let passkey = cryptoPbkdf2Sync(password);

    const user = new User({
        name, 
        email, 
        password: passkey
    });

    try {
        await user.save();
        let data = {
            email: user.email,
            name: user.name,
        }
        ctx.session = await data;
        let sess = await ctx.cookies.get('koa:sess');
        return ctx.body = {
            sess,
            user: data
        };

        ctx.body = user
    } catch (e) {
        ctx.throw(e, 500);
    }
}

exports.login = async (ctx) => {
    const { email, password } = ctx.request.body;
    if(!email || !password) 
        ctx.status = 400;
    if(!email) return ctx.body = `이메일을 입력하지 않으셨습니다.`;
    if(!password) return ctx.body = `비밀번호를 입력하지 않으셨습니다.`;
    let passkey = cryptoPbkdf2Sync(password);

    try {
        const user = await User.findOne({email}).exec();
        if(passkey === user.password) {
            let data = {
                email: user.email,
                name: user.name,
            }
            ctx.session = await data;
            let sess = await ctx.cookies.get('koa:sess');
            return ctx.body = {
                sess,
                user: data
            };
        }
        ctx.status = 401;
        if(user) {
            return ctx.body = `이메일 또는 비밀번호가 일치하지 않습니다.`;
        }
    } catch(e) {
        ctx.status = 400;
        return ctx.body = `존재하지 않는 이메일 입니다.`;
    }
}

exports.modify = async (ctx) => {
    const body = ctx.request.body;
    const sess = ctx.user;

    if(!sess.email || !body.name ||!body.email || !body.beforePassword || 
        !body.afterPassword || (body.email !== sess.emil)) ctx.status = 400;
    if(!sess.email) return ctx.body = '로그인 후 이용 가능합니다.';
    if(sess.email !== body.email) return ctx.body = '로그인 정보와 일치하지 않습니다.';
    if(!body.name) return ctx.body = `이름을 입력하지 않으셨습니다.`;
    if(!body.email) return ctx.body = `이메일을 입력하지 않으셨습니다.`;
    if(!body.beforePassword) return ctx.body = `기존 비밀번호를 입력하지 않으셨습니다.`;
    if(!body.afterPassword) return ctx.body = `새로운 비밀번호를 입력하지 않으셨습니다.`;

    let passkey = cryptoPbkdf2Sync(body.beforePassword);

    try {
        let matchUser = await User.find({email: body.email, password: passkey})[0].exec();
        console.log(matchUser);
        
    } catch (e) {
        ctx.status = 400;
        return ctx.body = '해당 유저를 찾을 수 없습니다.';
    }
    
    let data = {
        name: ctx.request.body.name,
        email: ctx.request.body.email,
        password: passkey,
    };

    try {
        const user = await User.findOneAndUpdate({email: body.email, password: passkey}, data, {new: true}).exec();
        if(passkey === user.password) {
            let data = {
                email: user.email,
                name: user.name,
            }
            ctx.session = await data;
            let sess = await ctx.cookies.get('koa:sess');
            return ctx.body = {
                sess,
                user: data
            };
        }
        ctx.status = 401;
        if(user) {
            return ctx.body = `이메일 또는 비밀번호가 일치하지 않습니다.`;
        }
    } catch(e) {
        ctx.throw(e, 500);
    }
}

exports.logout = async (ctx) => {
    ctx.session = null;
    let sess = ctx.cookies.get('koa:sess');
    if(sess) {
        console.log(`sess : (before destroy)`, sess);
        // await ctx.cache.destroy(sess);
        ctx.session = null;
        ctx.cookies.set('koa:sess', null);
    }
    ctx.body = 'logout';
}

exports.check = (ctx) => {
    console.log(`check`);
    let user = ctx.user;
    console.log(user);
    ctx.body = user;
}

exports.info = async (ctx) => {
    const { id } = ctx.params;
    let passkey = cryptoPbkdf2Sync(id);
    try {
        const user = await User.findById(id).exec();
        ctx.body = user;
    } catch (e) {
        ctx.throw(e, 500);
    }
}

exports.list = async (ctx) => {
    try {
        const users = await User.find().exec();
        ctx.body = users;
    } catch (e) {
        ctx.throw(e, 500);
    }
}

exports.remove = async (ctx) => {
    const { id } = ctx.params;
    try {
        await User.findByIdAndRemove(id).exec();
        ctx.body = "삭제되었습니다."
    } catch (e) {
        ctx.throw(e, 500);
    }
}

exports.checkObjectId = (ctx, next) => {
    const { id } = ctx.params;
    if(!ObjectId.isValid(id)) {
        ctx.status = 400;
        return null;
    }

    return next();
}
