import { Hono } from 'hono'
import { auth } from './better-auth/auth'
import { compress } from '@hono/bun-compress'
import { cors } from "hono/cors";
import { createCategory } from './controllers/categories/create';
import { updateCategory } from './controllers/categories/update';
import { deleteCategory } from './controllers/categories/delete';
import { createPaperWork } from './controllers/paperworks/create';
import { getById } from './controllers/paperworks/getById';
import { updatePaperWork } from './controllers/paperworks/update';
import { deletePaperWork } from './controllers/paperworks/delete';
import { getCategories } from './controllers/categories/get';
import { getByUserId_old } from './controllers/paperworks/getByUserId_old';
import { getByUserId } from './controllers/paperworks/getByUserId';
import { getByCategoryId } from './controllers/paperworks/getByCategoryId';
import { updateCategoriesByPaperworkId } from './controllers/paperworks/updateCategories';
import { AuthType } from './better-auth/auth';
import authController from './controllers/auth/authController';
import { downloadDocument } from './controllers/documents/download';
import { uploadDocument } from './controllers/documents/upload';
import { removeDocument } from './controllers/documents/remove';
import { setCover } from './controllers/documents/setCover';
import { checkexistingpassword } from './controllers/users/checkexistingpassword';
import { setPassword } from './controllers/users/setpassword';
import { getThemes } from './controllers/themes/get';
import { setTheme } from './controllers/themes/set';
import { getUserTheme } from './controllers/themes/getUserTheme';
import { setPasswordForEmail } from './controllers/admin/setPasswordForEmail';
import { createShareLink } from './controllers/paperworks/createShareLink';
import { viewSharedPaperwork } from './controllers/paperworks/viewSharedPaperwork';

const app = new Hono<{ Variables: AuthType }>({
	strict: false
}).basePath('/api');

app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
  	if (!session) {
    	c.set("user", null);
    	c.set("session", null);
    	return next();
  	}
  	c.set("user", session.user);
  	c.set("session", session.session);
  	return next();
}, cors({
	origin: ['http://tindecken.xyz', 'https://tindecken.xyz', 'http://localhost', 'http://localhost:1000', 'http://localhost:3001', 'https://paperwork.tindecken.xyz', 'https://paperworkapi.tindecken.xyz'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
	credentials: true,
	exposeHeaders: ['Content-Length', 'X-Kuma-Revision']
}));
app.use(compress({ encoding: "gzip"}))
app.notFound((c) => {
  return c.text('404 Route not found !', 404)
})

// auth
app.route('/auth', authController)

// categories
app.route('/categories', createCategory)
app.route('/categories', updateCategory)
app.route('/categories', deleteCategory)
app.route('/categories', getCategories)

// paperworks
app.route('/paperworks', createPaperWork)
app.route('/paperworks', getById)
app.route('/paperworks', updatePaperWork)
app.route('/paperworks', deletePaperWork) //
app.route('/paperworks', getByUserId) // get all paperworks by user id (new version, don't depend on categoy)
app.route('/paperworks', getByUserId_old) // get all paperworks by user id (old version, depend on category)
app.route('/paperworks', getByCategoryId) // get all paperworks by category id
app.route('/paperworks', updateCategoriesByPaperworkId) // update categories for paperwork
app.route('/paperworks', createShareLink) // create share link for paperwork
app.route('/paperworks', viewSharedPaperwork) // view shared paperwork without authentication

// documents
app.route('/documents', downloadDocument)
app.route('/documents', uploadDocument)
app.route('/documents', removeDocument)
app.route('/documents', setCover)

// users
app.route('/users', checkexistingpassword)
app.route('/users', setPassword)

// themes
app.route('/themes', getThemes)
app.route('/themes', setTheme)
app.route('/themes', getUserTheme)

// admin
app.route('/admin', setPasswordForEmail)

export default { 
  port: process.env.PORT || 3001, 
  fetch: app.fetch, 
  idleTimeout: 60
} 