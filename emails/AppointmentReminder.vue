<script setup lang="ts">
	interface Props {
		patientName: string;
		doctorName: string;
		appointmentDateTime: string;
		visitMode: string;
		appointmentType: string;
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
			<EPreview>Przypomnienie o nadchodzącej wizycie.</EPreview>
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
									Przypomnienie o wizycie
								</EText>
								<EHeading
									style="
										font-size: 28px;
										margin: 0 0 16px;
										line-height: 1.2;
										color: #0f172a;
									"
								>
									Dzień dobry, {{ patientName }}!
								</EHeading>
								<EText
									style="
										font-size: 16px;
										line-height: 1.6;
										color: #4b5563;
										margin: 0 0 24px;
									"
								>
									Przypominamy o zbliżającej się wizycie. Poniżej szczegóły.
								</EText>
								<table
									role="presentation"
									width="100%"
									style="
										border-collapse: collapse;
										margin-bottom: 24px;
										font-size: 15px;
										color: #0f172a;
									"
								>
									<tbody>
										<tr>
											<td
												style="
													padding: 8px 16px 8px 0;
													color: #6b7280;
													width: 160px;
												"
											>
												Lekarz
											</td>
											<td style="padding: 8px 0; font-weight: 600">
												{{ doctorName }}
											</td>
										</tr>
										<tr>
											<td
												style="
													padding: 8px 16px 8px 0;
													color: #6b7280;
													width: 160px;
												"
											>
												Data i godzina
											</td>
											<td style="padding: 8px 0; font-weight: 600">
												{{ appointmentDateTime }}
											</td>
										</tr>
										<tr>
											<td
												style="
													padding: 8px 16px 8px 0;
													color: #6b7280;
													width: 160px;
												"
											>
												Rodzaj
											</td>
											<td style="padding: 8px 0; font-weight: 600">
												{{ appointmentType }}
											</td>
										</tr>
										<tr>
											<td
												style="
													padding: 8px 16px 8px 0;
													color: #6b7280;
													width: 160px;
												"
											>
												Tryb wizyty
											</td>
											<td style="padding: 8px 0; font-weight: 600">
												{{ visitMode }}
											</td>
										</tr>
									</tbody>
								</table>
								<EText
									style="
										font-size: 14px;
										line-height: 1.6;
										color: #6b7280;
										margin: 0 0 16px;
									"
								>
									Jeśli coś się zmieni, odwołaj wizytę z wyprzedzeniem w panelu
									pacjenta.
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
