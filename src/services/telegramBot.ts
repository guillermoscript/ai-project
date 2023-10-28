import payload from 'payload';
import { Telegraf, type Context, Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import type { Update } from "telegraf/types";
import path from 'path';
import downloadFile from '../utilities/downloadFile';
import { audioResume } from './openAi';
import { openai } from '../server';



export interface MyTelegramContext<U extends Update = Update> extends Context<U> {
    session: {
        users: Array<{
            apikey: string;
            userId: number;
            name?: string;
            payloadId?: string;
            lastAudio?: string;
        }>
    },
};



// Remember, this should ideally be written before `bot.launch()`!
export function telegramStart(ctx) {
    return ctx.reply(`Hola  ${ctx.update.message.from.first_name}!, para usar este bot primero debe iniciar session con el comando /login, asi podremos `);
}




/**
 * It is possible to extend the session object that is available to each scene.
 * This can be done by extending `SceneSessionData` and in turn passing your own
 * interface as a type variable to `SceneSession` and to `SceneContextScene`.
 */
interface MySceneSession extends Scenes.SceneSessionData {
	// will be available under `ctx.scene.session.users`
    users: Array<{
      apikey: string;
      userId: number;
      name?: string;
      payloadId?: string;
  }>
}

/**
 * We can still extend the regular session object that we can use on the
 * context. However, as we're using scenes, we have to make it extend
 * `SceneSession`.
 *
 * It is possible to pass a type variable to `SceneSession` if you also want to
 * extend the scene session as we do above.
 */
interface MySession extends Scenes.SceneSession<MySceneSession> {
	// will be available under `ctx.session.users`
    users: Array<{
      apikey: string;
      userId: number;
      name?: string;
      payloadId?: string;
  }>
}

/**
 * Now that we have our session object, we can define our own context object.
 *
 * As always, if we also want to use our own session object, we have to set it
 * here under the `session` property. In addition, we now also have to set the
 * scene object under the `scene` property. As we extend the scene session, we
 * need to pass the type in as a type variable once again.
 */
interface MyContext extends Context {
	// will be available under `ctx.myContextProp`
	myContextProp: string;

	// declare session type
	session: MySession;
	// declare scene type
	scene: Scenes.SceneContextScene<MyContext, MySceneSession>;
}

// // Handler factories
// const { enter, leave } = Scenes.Stage;

// // Greeter scene
// const greeterScene = new Scenes.BaseScene<MyContext>("greeter");
// greeterScene.enter(async ctx => {
//   // validations
//   if (!ctx.session?.users.find((user) => user.userId === ctx.from.id)) {
//     return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
//   }

//   const payloadUser = await payload.findByID({
//     collection: 'users',
//     id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
//   });

//   if (!payloadUser) {
//     return ctx.reply('Your user does not exist. Please use the /login command to log in.');
//   }

//   await ctx.reply('asdasdasdasd');

//   bot.on(message('voice'), async (ctx) => {
//     try {

//       await ctx.reply('Please wait while we transcribe your audio file...');
//       return ctx.reply('234234324234234324')
//     } catch (error) {
//       console.error(error);
//       return ctx.reply('An error occurred while logging in. Please try again later.');
//     }
//   });
// });
// greeterScene.leave(ctx => ctx.reply("Bye"));
// greeterScene.hears("hi", enter<MyContext>("greeter"));

// // Echo scene
// const echoScene = new Scenes.BaseScene<MyContext>("echo");
// echoScene.enter( async ctx => {
//   console.log(ctx, 'ctx')
//   console.log(ctx.scene.session.users, 'users on enter')
//   // validations
//   if (!ctx.session?.users.find((user) => user.userId === ctx.from.id)) {
//     return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
//   }

//   const payloadUser = await payload.findByID({
//     collection: 'users',
//     id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
//   });

//   if (!payloadUser) {
//     return ctx.reply('Your user does not exist. Please use the /login command to log in.');
//   }

//   await ctx.reply('Please send an voice message to transcribe. We will also provide you with key points and action items.');

//   bot.on(message('voice'), async (ctx) => {
//     try {

//       await ctx.reply('Please wait while we transcribe your audio file...');
//       return ctx.reply('Transcription is not available at this time. Please try again later.')
//     } catch (error) {
//       console.error(error);
//       return ctx.reply('An error occurred while logging in. Please try again later.');
//     }
//   });

// });
// echoScene.leave(ctx => ctx.reply("exiting echo scene"));
// echoScene.command("back", leave<MyContext>());



//   const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN);
//   // bot.start(telegramStart);

//   const stage = new Scenes.Stage<MyContext>([greeterScene, echoScene], {
//     ttl: 10,
//   });



//   // // Make session data available
//   // bot.use(session({
//   //   defaultSession: () => (
//   //     { users: [] }
//   //   )
//   // }));
//   bot.use(session());
//   bot.use(stage.middleware());
//   bot.use((ctx, next) => {
//     // we now have access to the the fields defined above
//     // ctx.myContextProp ??= "";
//     // ctx.session.
//     // ctx.scene.session.mySceneSessionProp ??= 0;
//     ctx.session.users ??= [];
//     ctx.scene.session.users ??= [];
    
//     return next();
//   });
//   bot.command("greeter", ctx => ctx.scene.enter("greeter"));
//   bot.command("echo", ctx => ctx.scene.enter("echo"));

//   // Login action
//   bot.command('login', async (ctx) => {

//     // Send a message to the user to enter their credentials
//     await ctx.reply('Please enter your username and password in the following format: username:password');

//     // Listen for the user's response
//     bot.on(message('text'), async (ctx) => {
//       const credentials = ctx.message.text.split(':');
//       const email = credentials[0];
//       const password = credentials[1];
//       try {
//         // Send a request to your API to authenticate the user
//         const response = await payload.login({
//           collection: 'users',
//           data: {
//             email,
//             password
//           }
//         });

//         console.log(ctx.session?.users, 'users on login before')
//         // check if user is logged in
//         if (response.user) {

//           // If the user is authenticated, check for the user in the session
//           const isUserInSession = ctx.session?.users.find((user) => user.userId === ctx.from.id);
//           const isUserInSceneSession = ctx.scene.session?.users.find((user) => user.userId === ctx.from.id);



//           // If the user is not in the session, add them to the session
//           if (!isUserInSession) {
//             ctx.session?.users.push({
//               apikey: response.user.apiKey,
//               userId: ctx.from.id,
//               name: ctx.from.first_name,
//               payloadId: response.user.id
//             });
//           }

//           if (!isUserInSceneSession) {
//             ctx.scene.session?.users.push({
//               apikey: response.user.apiKey,
//               userId: ctx.from.id,
//               name: ctx.from.first_name,
//               payloadId: response.user.id
//             });
//             return ctx.reply('You have been successfully logged in!');
//           }

//           return ctx.reply('You are already logged in.');
//         } else {
//           return ctx.reply('Invalid username or password. Please try again.');
//         }
//       } catch (error) {
//         console.error(error);
//         console.log((error as any)?.response?.data)
//         return await ctx.reply('An error occurred while logging in. Please try again later.');
//       }
//     });

//     return;
//   });

//   // Voice action
//   // bot.on(message('voice'), async (ctx) => {

//   //   // validations
//   //   if (!ctx.session?.users.find((user) => user.userId === ctx.from.id)) {
//   //     return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
//   //   }

//   //   const payloadUser = await payload.findByID({
//   //     collection: 'users',
//   //     id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
//   //   });

//   //   if (!payloadUser) {
//   //     return ctx.reply('Your user does not exist. Please use the /login command to log in.');
//   //   }

//   //   try {

//   //       await ctx.reply('Please wait while we transcribe your audio file...');
//   //       const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
//   //       const url = link.href;
//   //       const randomName = Math.random().toString(34).substring(7);
//   //       const filePath = path.join(__dirname, 'audio', `${ctx.from.first_name}-${randomName}.ogg`);
//   //       await downloadFile(url, filePath);
//   //       const response = await audioTranscription({
//   //         openai,
//   //         filePath,
//   //       });

//   //       return ctx.reply(response);
//   //     } catch (error) {
//   //       console.error(error);
//   //       return ctx.reply('An error occurred while logging in. Please try again later.');
//   //     }
//   // });

//   bot.command('logout', async (ctx) => {
//     // validations
//     if (!ctx.session?.users.find((user) => user.userId === ctx.from.id)) {
//       return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
//     }

//     // remove user from session
//     ctx.session.users = ctx.session.users.filter((user) => user.userId !== ctx.from.id);

//     return ctx.reply('You have been successfully logged out!');
//   });

//   bot.command('resume', async (ctx) => {
//     // validations
//     if (!ctx.session?.users.find((user) => user.userId === ctx.from.id)) {
//       return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
//     }

//     const payloadUser = await payload.findByID({
//       collection: 'users',
//       id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
//     });

//     if (!payloadUser) {
//       return ctx.reply('Your user does not exist. Please use the /login command to log in.');
//     }

//     await ctx.reply('Please send an audio file to transcribe. We will also provide you with key points and action items.');

//     bot.on(message('voice'), async (ctx) => {
//       try {

//         await ctx.reply('Please wait while we transcribe your audio file...');

//         // ! This code works but it's commented out because it's not being used
//         // const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
//         // const url = link.href;
//         // const randomName = Math.random().toString(34).substring(7);
//         // const filePath = path.join(__dirname, 'audio', `${ctx.from.first_name}-${randomName}.ogg`);
//         // await downloadFile(url, filePath);
//         // const response = await audioResume({
//         //   openai,
//         //   filePath,
//         // });

//         // const keyPointsText = response.keyPoints.text
//         // const actionItemsText = response.actionItems.text

//         // await ctx.reply(`Transcription: ${response.transcription}`);
//         // await ctx.reply(`Key points: ${keyPointsText}`);
//         // await ctx.reply(`Action items: ${actionItemsText}`);

//         // const metric = await payload.create<'metrics'>({
//         //   collection: 'metrics',
//         //   data: {
//         //     value: {
//         //       audioLength: ctx.message.voice.duration,
//         //       keyPoints: response.keyPoints.usage,
//         //       actionItems: response.actionItems.usage,
//         //     },
//         //     user: payloadUser.id,
//         //   }
//         // });

//         // console.log(metric, '<----------- metric');


//         // return ctx.reply('Thank you for using our bot! We hope to see you again soon.')
//         // stop listening for voice messages
//         return ctx.reply('Thank you for using our bot! We hope to see you again soon.')
//       } catch (error) {
//         console.error(error);
//         return ctx.reply('An error occurred while logging in. Please try again later.');
//       }
//     })

//     return;
//   })

//   bot.command('transcribe', async (ctx) => {
//     // validations
//     if (!ctx.session?.users.find((user) => user.userId === ctx.from.id)) {
//       return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
//     }

//     const payloadUser = await payload.findByID({
//       collection: 'users',
//       id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
//     });

//     if (!payloadUser) {
//       return ctx.reply('Your user does not exist. Please use the /login command to log in.');
//     }

//     await ctx.reply('Please send an audio file to transcribe.');

//     bot.on(message('voice'), async (ctx) => {
//       try {

//         await ctx.reply('Please wait while we transcribe your audio file...');
//         // ! This code works but it's commented out because it's not being used
//         // const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
//         // const url = link.href;
//         // const randomName = Math.random().toString(34).substring(7);
//         // const filePath = path.join(__dirname, 'audio', `${ctx.from.first_name}-${randomName}.ogg`);
//         // await downloadFile(url, filePath);
//         // const response = await audioTranscription({
//         //   openai,
//         //   filePath,
//         // });

//         // const metric = await payload.create<'metrics'>({
//         //   collection: 'metrics',
//         //   data: {
//         //     value: {
//         //       audioLength: ctx.message.voice.duration,
//         //     },
//         //     user: payloadUser.id,
//         //   }
//         // });

//         // console.log(metric, '<----------- metric');

//         // return ctx.reply(response);

//         return ctx.reply('Transcription is not available at this time. Please try again later.')
//       } catch (error) {
//         console.error(error);
//         return ctx.reply('An error occurred while logging in. Please try again later.');
//       }
//     });

//     return;
//   });

//   bot.launch();

//   // Enable graceful stop
//   process.once('SIGINT', () => bot.stop('SIGINT'));
//   process.once('SIGTERM', () => bot.stop('SIGTERM'));