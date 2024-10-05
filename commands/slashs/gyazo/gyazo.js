const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const colors = require('colors/safe');
const FormData = require('form-data');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gyazo')
		.setDescription('Uploads an image to Gyazo and returns the URL.')
		.addAttachmentOption(option => 
			option.setName('image')
			.setDescription('Attach an image to upload to Gyazo.')
			.setRequired(true)),

	async execute(interaction) {
		try {
			if (!process.env.GyazoToken) {
				return interaction.reply({ 
					content: '❌ | Gyazo API token is missing. Please configure it in the environment variables.', 
					ephemeral: true 
				});
			}

			const attachment = interaction.options.getAttachment('image');

			const maxSizeInBytes = 50 * 1024 * 1024;
			if (attachment.size > maxSizeInBytes) {
				return interaction.reply({ 
					content: `❌ | The image size exceeds the 50MB limit (your image: ${(attachment.size / (1024 * 1024)).toFixed(2)}MB).`, 
					ephemeral: true 
				});
			}

			const form = new FormData();
			const imageStream = await axios.get(attachment.url, { responseType: 'stream' });
			form.append('imagedata', imageStream.data);

			const gyazoResponse = await axios.post('https://upload.gyazo.com/api/upload', form, {
				headers: {
					...form.getHeaders(),
					'Authorization': `Bearer ${process.env.GyazoToken}`,
				}
			});

			if (!gyazoResponse.data.url) {
				throw new Error('Failed to retrieve image URL from Gyazo.');
			}

			const imageUrl = gyazoResponse.data.url;

			const embed = new EmbedBuilder()
				.setColor('Blue')
				.setTitle('🖼️ | Gyazo URL')
				.setDescription(`${imageUrl}`)
				.setImage(imageUrl)
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });

		} catch (err) {
			if (err.response) {
				console.error(colors.red(`Gyazo API Error: ${err.response.status} - ${err.response.statusText}`));
				await interaction.reply({ 
					content: `❌ | Gyazo API Error: ${err.response.status} - ${err.response.statusText}`, 
					ephemeral: true 
				});
			} else if (err.request) {
				console.error(colors.red('Gyazo API Request Failed'));
				await interaction.reply({ 
					content: '❌ | Failed to connect to Gyazo API. Please try again later.', 
					ephemeral: true 
				});
			} else {
				console.error(colors.red(`Error: ${err.message}`));
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ 
						content: '❌ | An error occurred while uploading the image to Gyazo.', 
						ephemeral: true 
					});
				} else {
					await interaction.reply({ 
						content: '❌ | An error occurred while uploading the image to Gyazo.', 
						ephemeral: true 
					});
				}
			}
		}
	},
};
