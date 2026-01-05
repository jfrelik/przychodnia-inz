<script setup lang="ts">
	interface Props {
		userName: string;
		resetUrl: string;
	}

	defineProps<Props>();
</script>

<template>
	<EHtml lang="pl">
		<EHead>
			<EStyle>
				{{
					`
						@media (max-width: 600px) {
							.card {
								padding: 32px 24px !important;
							}

							.cta-button {
								width: 100% !important;
							}
						}
					`
				}}
			</EStyle>
		</EHead>
		<EBody
			:style="{
				backgroundColor: '#f4f4f5',
				padding: '48px 16px',
			}"
		>
			<EPreview>Zmień hasło do swojego konta w naszej przychodni.</EPreview>
			<EContainer>
				<table
					role="presentation"
					width="100%"
					style="
						border-radius: 24px;
						background: #ffffff;
						border: 1px solid #e5e7eb;
						box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
						font-family: sans-serif, Helvetica;
					"
				>
					<tbody>
						<tr>
							<td class="card" style="padding: 48px 40px; text-align: left">
								<EHeading
									style="
										font-size: 28px;
										margin: 0 0 16px;
										line-height: 1.2;
										color: #0f172a;
									"
								>
									Dzień dobry, {{ userName }}!
								</EHeading>
								<EText
									style="
										font-size: 16px;
										line-height: 1.6;
										color: #4b5563;
										margin: 0 0 24px;
									"
								>
									Otrzymaliśmy prośbę o zmianę hasła do Twojego konta. Kliknij
									przycisk poniżej, aby ustawić nowe hasło. Link jest ważny
									przez godzinę.
								</EText>
								<EButton
									class="cta-button"
									:href="resetUrl"
									:style="{
										backgroundColor: '#2563eb',
										borderRadius: '9999px',
										color: '#ffffff',
										fontSize: '16px',
										fontWeight: 600,
										letterSpacing: '0.02em',
										padding: '16px 32px',
										textAlign: 'center',
										boxShadow: '0 12px 30px rgba(37, 99, 235, 0.35)',
									}"
								>
									Zmień hasło
								</EButton>
								<EText
									style="
										font-size: 14px;
										line-height: 1.6;
										color: #6b7280;
										margin: 32px 0 16px;
									"
								>
									Jeżeli przycisk nie działa, skopiuj i wklej poniższy adres w
									przeglądarce:
								</EText>
								<EText
									style="
										font-size: 14px;
										line-height: 1.6;
										color: #000000;
										margin: 0 0 16px;
										word-break: break-all;
									"
								>
									{{ resetUrl }}
								</EText>

								<EText
									style="
										font-size: 14px;
										line-height: 1.6;
										color: #94a3b8;
										margin: 0;
									"
								>
									Z pozdrowieniami,
									<br />
									<strong>Przychodnia</strong>
								</EText>
							</td>
						</tr>
					</tbody>
				</table>
				<EText
					style="
						font-size: 12px;
						line-height: 1.6;
						color: #94a3b8;
						margin: 32px 0 0;
						text-align: center;
					"
				>
					Wiadomość została wysłana automatycznie – prosimy na nią nie
					odpowiadać.
				</EText>
			</EContainer>
		</EBody>
	</EHtml>
</template>
