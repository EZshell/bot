import { Config, NodeSSH } from 'node-ssh'
import { ClientChannel, SFTPWrapper } from 'ssh2';


class EZssh {

    private client;
    private config;
    private shell: ClientChannel | null = null;




    constructor(config: Config) {
        this.config = config
        this.client = new NodeSSH()
    }

    public async connect() {
        await this.client.connect(this.config)
    }

    public isConnected() {
        return this.client.isConnected()
    }



    public async openShell(callback: (arg0: string) => void) {
        this.shell?.close()
        this.shell = await this.client.requestShell()
        this.shell.on("data", (data: Buffer) => {
            callback(data.toString())
        })
        this.shell.on("exit", (code: string) => {
            callback("\nExit: " + code)
        })
        this.shell.stderr.on("data", (data: Buffer) => {
            callback("\nError: " + data.toString())
        })
        return this
    }

    public exitShell() {
        if (!this.shell) return false
        this.shell.close()
    }

    public writeCommand(command: string) {
        if (!this.shell) return false
        this.shell.write(command)
    }

    // @@@@@@@@@@@@@@
    private isAutoEnter: boolean = true;
    public setAutoEnter() {
        this.isAutoEnter = !this.isAutoEnter
    }
    public getAutoEnter() {
        return this.isAutoEnter
    }

    // @@@@@@@@@@@@@@
    private isCrtlPressed: boolean = false;
    public setCrtlPressed() {
        this.isCrtlPressed = !this.isCrtlPressed
    }
    public getCrtlPressed() {
        return this.isCrtlPressed
    }

    // @@@@@@@@@@@@@@
    private isAltPressed: boolean = false;
    public setAltPressed() {
        this.isAltPressed = !this.isAltPressed
    }
    public getAltPressed() {
        return this.isAltPressed
    }


    // #################
    public async uploadFile(local: string, remote: string) {
        return await this.client.putFile(local, remote)
    }


    public async downloadFile(local: string, remote: string) {
        return await this.client.getFile(local, remote)
    }

    // public exitSftp() {
    //     if (!this.sftp) return false
    //     // this.sftp.fastPut()
    // }
}


export default EZssh