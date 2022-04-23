### HOW TO FIND PLUGS PARAMETERS

## Listing Tuya devices from the **Tuya Smart** or **Smart Life** apps

This method is fast and easy. If you're having trouble manually linking your device with the below method, we recommend you try this. All devices that you want to use **must** be registered in either the Tuya Smart app or the Smart Life app.

1. Follow steps 1 through 3 from the "Linking a Tuya device with Smart Link" method below.
2. Go to Cloud -> Development and click the project you created earlier. Then click the "Devices" tab. Click the "Link Tuya App account" tab, and select the right data center in the upper right dropdown (eg Western America).
3. Click "Add App Account" and scan the QR code from your smart phone/tablet app by going to the 'Me' tab in the app, and tapping a QR code / Scan button in the upper right. Your account will now be linked.
4. On the command line, run `tuya-cli wizard`. It will prompt you for required information, and will then list out all your device names, IDs, and keys for use with TuyAPI. Copy and save this information to a safe place for later reference.

## Linking a Tuya device with Smart Link

This method requires you to create a developer account on [iot.tuya.com](https://iot.tuya.com). It doesn't matter if the device(s) are currently registered in the Tuya Smart app or Smart Life app or not.

1. Create a new account on [iot.tuya.com](https://iot.tuya.com) and make sure you are logged in. **Select United States as your country when signing up.** This seems to skip a [required verify step](https://github.com/codetheweb/tuyapi/issues/425).
2. Go to Cloud -> Projects in the left nav drawer. If you haven't already, you will need to "purchase" the Trial Plan before you can proceed with this step. You will not have to add any form of payment, and the purchase is of no charge. Once in the Projects tab, click "Create". **Make sure you select "Smart Home" for both the "Industry" field and  the development method.** Select your country of use in the for the location access option, and feel free to skip the services option in the next window. After you've created a new project, click into it. The "Access ID/Client ID" and "Access Secret/Client Secret" are the API Key and API Secret values need in step 7.
3. Go to Cloud -> Development -> "MyProject" -> Service API -> "Go to authorize". "Select API" > click subscribe on "IoT Core", "Authorization", and "Smart Home Scene Linkage" in the dropdown. Click subscribe again on every service (also check your PopUp blocker). Click "basic edition" and "buy now" (basic edition is free). Check if the 4 services are listed under Cloud -> Projects -> "MyProject" -> API. If not, click "Add Authorization" and select them.
4. Go to App -> App SDK -> Development in the nav drawer. Click "Create" and enter whatever you want for the package names and Channel ID (for the Android package name, you must enter a string beginning with `com.`). Take note of the **Channel ID** you entered. This is equivalent to the `schema` value needed in step 7. Ignore any app key and app secret values you see in this section as they are not used.
5. Go to Cloud -> Development and click the project you created earlier. Then click "Link Device". Click the "Link devices by Apps" tab, and click "Add Apps". Check the app you just created and click "Ok".
6. Put your devices into linking mode.  This process is specific to each type of device, find instructions in the Tuya Smart app. Usually this consists of turning it on and off several times or holding down a button.
7. On the command line, run `tuya-cli link --api-key <your api key> --api-secret <your api secret> --schema <your schema/Channel ID> --ssid <your WiFi name> --password <your WiFi password> --region us`.  For the region parameter, choose the two-letter country code from `us`, `eu`, and `cn` that is geographically closest to you.
8. Your devices should link in under a minute and the parameters required to control them will be printed out to the console. If you experience problems, first make sure any smart phone/tablet app that you use with your devices is completely closed and not attempting to communicate with any of the devices.

# REQUIREMENTS
NodeJS ^16

an instance of influx db

## RUN CONTAINER
The `<configurationFile>` must be a copy of .envExamples

`docker run --env-file <configurationFile> -p 6666-6667:6666-6667/udp -d --network host --name <containerName> <dockerImage>`
