import express from 'express';
import payload from 'payload';
import path from 'path';
import { OpenAI } from 'openai'
import { MyTelegramContext, telegramStart } from './services/telegramBot';
import { audioResume, audioTranscription } from './services/openAi';
import { Telegraf, session } from 'telegraf';
import downloadFile from './utilities/downloadFile';
import { message } from 'telegraf/filters';
import { runInactivateSubscriptionAndCreateRenewalOrder } from './services/cron';


require('dotenv').config();
const app = express();

export const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
  timeout: 90000,
});

// Redirect root to Admin panel
app.get('/', (_, res) => {
  res.redirect('/admin');
});



const start = async () => {
  // Initialize Payload
  const secret = process.env.PAYLOAD_SECRET
  const mongoURL = process.env.MONGODB_URI

  if (!secret) {
    throw new Error('Missing env var: PAYLOAD_SECRET')
  }

  if (!mongoURL) {
    throw new Error('Missing env var: MONGODB_URI')
  }

  await payload.init({
    secret,
    mongoURL, express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`)
    },
  })

  // Add your own express routes here  
  const bot = new Telegraf<MyTelegramContext>(process.env.TELEGRAM_BOT_TOKEN);

  // Make session data available
  bot.use(session({
    defaultSession: () => (
      { users: [] }
    )
  }));

  bot.start(telegramStart);

  // Login action
  bot.command('login', async (ctx) => {

    // Send a message to the user to enter their credentials
    await ctx.reply('Please enter your username and password in the following format: username:password');

    // Listen for the user's response
    bot.on(message('text'), async (ctx) => {
      const credentials = ctx.message.text.split(':');
      const email = credentials[0];
      const password = credentials[1];

      try {
        // Send a request to your API to authenticate the user
        const response = await payload.login({
          collection: 'users',
          data: {
            email,
            password
          }
        });

        console.log(ctx.session?.users, 'users on login before')
        // check if user is logged in
        if (response.user) {

          // If the user is authenticated, check for the user in the session
          const isUserInSession = ctx.session?.users.find((user) => user.userId === ctx.from.id);

          // If the user is not in the session, add them to the session
          if (!isUserInSession) {
            ctx.session?.users.push({
              apikey: response.user.apiKey,
              userId: ctx.from.id,
              name: ctx.from.first_name,
              payloadId: response.user.id
            });

            return ctx.reply('You have been successfully logged in!');
          }

          return ctx.reply('You are already logged in.');
        } else {
          return ctx.reply('Invalid username or password. Please try again.');
        }
      } catch (error) {
        console.error(error);
        console.log((error as any)?.response?.data)
        return await ctx.reply('An error occurred while logging in. Please try again later.');
      }
    });

    return
  });

  bot.command('logout', async (ctx) => {
    // validations
    if (!ctx.session?.users.find((user) => user.userId === ctx.from.id)) {
      return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
    }

    // remove user from session
    ctx.session.users = ctx.session.users.filter((user) => user.userId !== ctx.from.id);

    return ctx.reply('You have been successfully logged out!');
  });

  bot.on(message('voice'), async (ctx) => {
    // validations
    const user = ctx.session?.users.find((user) => user.userId === ctx.from.id)
    if (!user) {
      return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
    }

    const payloadUser = await payload.findByID({
      collection: 'users',
      id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
    });

    if (!payloadUser) {
      return ctx.reply('Your user does not exist. Please use the /login command to log in.');
    }

    await ctx.reply('What do you wnat to do with this audio? /resumen or /transcripcion');

    // save audio id on session
    user.lastAudio = ctx.message.voice.file_id
    console.log(ctx.session?.users, 'users on login before')
    return

  });

  bot.command('resumen', async (ctx) => {
    const user = ctx.session?.users.find((user) => user.userId === ctx.from.id)
    if (!user) {
      return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
    }

    const payloadUser = await payload.findByID({
      collection: 'users',
      id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
    });

    if (!payloadUser) {
      return ctx.reply('Your user does not exist. Please use the /login command to log in.');
    }

    if (!user.lastAudio) {
      return ctx.reply('Please send an audio file to make a resume.');
    }

    try {
      await ctx.reply('Please wait while we transcribe your audio file...');

      const link = await ctx.telegram.getFileLink(user.lastAudio);
      const url = link.href;
      const randomName = Math.random().toString(34).substring(7);
      const filePath = path.join(__dirname, 'audio', `${ctx.from.first_name}-${randomName}.ogg`);
      await downloadFile(url, filePath);
      const response = await audioResume({
        openai,
        filePath,
      });

      if (!response.actionItems || !response.keyPoints || !response.transcription) {
        return ctx.reply('An error occurred while transcribing your audio. Please try again later.');
      }

      const keyPointsText = (response.keyPoints as {
        usage: OpenAI.Completions.CompletionUsage;
        text: string;
      })?.text
      const actionItemsText = (response.actionItems as {
        usage: OpenAI.Completions.CompletionUsage;
        text: string;
      })?.text

      await ctx.reply(`Transcription: ${response.transcription}`);
      await ctx.reply(`Key points: ${keyPointsText}`);
      await ctx.reply(`Action items: ${actionItemsText}`);

      // const metric = await payload.create<'metrics'>({
      //   collection: 'metrics',
      //   data: {
      //     value: {
      //       audioLength: ctx.message.voice.duration,
      //       keyPoints: response.keyPoints.usage,
      //       actionItems: response.actionItems.usage,
      //     },
      //     user: payloadUser.id,
      //   }
      // });

      // console.log(metric, '<----------- metric');
      user.lastAudio = null

      return ctx.reply('Thank you for using our bot! We hope to see you again soon.')

    } catch (error) {
      console.error(error);
      return ctx.reply('An error occurred while logging in. Please try again later.');
    }
  });

  bot.command('transcripcion', async (ctx) => {
    const user = ctx.session?.users.find((user) => user.userId === ctx.from.id)
    if (!user) {
      return ctx.reply('You must be logged in to use this bot. Please use the /login command to log in.');
    }

    const payloadUser = await payload.findByID({
      collection: 'users',
      id: ctx.session?.users.find((user) => user.userId === ctx.from.id)?.payloadId,
    });

    if (!payloadUser) {
      return ctx.reply('Your user does not exist. Please use the /login command to log in.');
    }

    if (!user.lastAudio) {
      return ctx.reply('Please send an audio file to transcribe.');
    }

    try {
      await ctx.reply('Please wait while we transcribe your audio file...');
      const link = await ctx.telegram.getFileLink(user.lastAudio);
      const url = link.href;
      const randomName = Math.random().toString(34).substring(7);
      const filePath = path.join(__dirname, 'audio', `${ctx.from.first_name}-${randomName}.ogg`);
      await downloadFile(url, filePath);
      const response = await audioTranscription({
        openai,
        filePath,
      });

      // const metric = await payload.create<'metrics'>({
      //   collection: 'metrics',
      //   data: {
      //     value: {
      //       audioLength: ctx.message.voice.duration,
      //     },
      //     user: payloadUser.id,
      //   }
      // });

      // console.log(metric, '<----------- metric');

      return ctx.reply(response);

    } catch (error) {
      console.error(error);
      return ctx.reply('An error occurred while logging in. Please try again later.');
    }
  })

  app.get('/cron', async (req, res) => {
    try {
      const data = await runInactivateSubscriptionAndCreateRenewalOrder()
      res.json(data)
    } catch (error) {
      res.json(error)
    }
  })


  bot.launch();

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
  app.listen(3000);
}

start();
