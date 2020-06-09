function mySettings(props) {
  return (
    <Page>
      <Text>
        This app collects your daily resting heart-rate data from 2019, and some profile data (gender, location and age). This is uploaded to a server for later analysis. Please don't use this app unless you're willing to share that data!
      </Text>
      <Text>
        You will be able to download the data after it has been collected, which may take a minute or two.
      </Text>
      <Oauth
        settingsKey="oauth"
        label="Fitbit Account"
        status={props.settingsStorage.getItem('accountStatus')}
        authorizeUrl="https://www.fitbit.com/oauth2/authorize"
        requestTokenUrl="https://api.fitbit.com/oauth2/token"
        clientId="[obfuscated]"
        clientSecret="[obfuscated]"
        scope="profile heartrate"
      />
      <Text><Text bold>Status: </Text>{props.settingsStorage.getItem('status')}</Text>
      { props.settingsStorage.getItem('downloadUrl') && <Text>If you want a copy of your data, use the link below. The .CSV file may be downloaded into your Downloads directory (or equivalent), or it may open in a spreadsheet. Don't try to open it with your Contacts app!</Text> }
      { props.settingsStorage.getItem('downloadUrl') && <Link source={props.settingsStorage.getItem('downloadUrl')}>Download</Link> }
    </Page>
  );
}

registerSettingsPage(mySettings)