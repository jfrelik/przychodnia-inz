<script setup lang="ts">
	interface Props {
		userName: string;
		confirmationUrl: string;
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
			<EPreview>
				Potwierdź swój adres e-mail, aby dokończyć rejestrację.
			</EPreview>
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
								<EText
									style="
										font-size: 14px;
										letter-spacing: 0.08em;
										text-transform: uppercase;
										color: #2563eb;
										font-weight: 600;
										margin: 0 0 12px;
									"
								>
									Nowe konto utworzone
								</EText>
								<EHeading
									style="
										font-size: 28px;
										margin: 0 0 16px;
										line-height: 1.2;
										color: #0f172a;
									"
								>
									Witaj, {{ userName }}!
								</EHeading>
								<EText
									style="
										font-size: 16px;
										line-height: 1.6;
										color: #4b5563;
										margin: 0 0 24px;
									"
								>
									Dziękujemy za rejestrację w naszej aplikacji. Aby aktywować
									konto i zacząć korzystać z pełnej funkcjonalności, kliknij
									przycisk poniżej.
								</EText>
								<EButton
									class="cta-button"
									:href="confirmationUrl"
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
									Potwierdź adres e-mail
								</EButton>
								<EText
									style="
										font-size: 14px;
										line-height: 1.6;
										color: #6b7280;
										margin: 32px 0 16px;
									"
								>
									Gdyby przycisk nie działał, skopiuj i wklej poniższy adres w
									przeglądarce:
								</EText>
								<EText
									style="
										font-size: 14px;
										line-height: 1.6;
										color: #000000;
										margin: 0 0 16px;
									"
								>
									{{ confirmationUrl }}
								</EText>
								<EText
									style="
										font-size: 14px;
										line-height: 1.6;
										color: #6b7280;
										margin: 0 0 16px;
									"
								>
									Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość. Link
									wygaśnie po 24 godzinach.
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
