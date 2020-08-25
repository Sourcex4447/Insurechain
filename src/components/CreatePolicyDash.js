import { Button, Card, Form, Input} from 'semantic-ui-react'
import React, { Component } from 'react'
import Web3 from 'web3'
import Policy from '../abis/policy.json';
import Portis from '@portis/web3';
import ipfs from './ipfs.js'
import Modal from "react-bootstrap/Modal";
import Matic from "@maticnetwork/maticjs";
const bn = require("bn.js");
const Network = require("@maticnetwork/meta/network");
const SCALING_FACTOR = new bn(10).pow(new bn(18));


const PolicyCard = props => (
  <tr>
    <td data-label="policyID">{props.policyCard[0]}</td>
    <td data-label="custID">{props.policyCard[2]}</td>
    <td data-label="poltype">{props.policyCard[4]}</td>
    <td data-label="hash">
      <a href={`https://ipfs.infura.io/ipfs/${props.policyCard[3]}`}>{props.policyCard[3]}</a>
    </td>
    <td>
        <Button onClick={() => { props.handleClaimButton(props.policyCard[0]) }} basic color='yellow'>
          Claim
        </Button>
        <Button onClick={() => { props.handlePortButton(props.policyCard[0]) }} basic color='pink'>
          Port
        </Button>
    </td>
  </tr>
)

const OptionCard = props => (
  <option value={props.opt}>
    {props.opt}
  </option>
)

const ClaimCard = props => (
  <tr>
    <td>{props.claimCard[0]}</td>
    <td>{props.claimCard[7]}</td>
    <td>{props.claimCard[1]}</td>
    <td>{props.claimCard[2]}</td>
    <td>{props.claimCard[3]}</td>
    <td data-label="hash">
      <a href={`https://ipfs.infura.io/ipfs/${props.claimCard[5]}`}>{props.claimCard[5]}</a>
    </td>
    <td>{props.claimCard[4]}</td>
    <td>{props.claimCard[6]}</td>
  </tr>
)

const PolicyOptions = props => (
  <option value={props.opt}>
    {props.opt}
  </option>
)


class CreatePolicyDash extends Component {

  constructor(props) {
    super(props)
    this.state = {
      buffer: null,
      account: '',
      hash: '',
      policySelected: 'None',
      policyTypes: [],
      portis: {},
      policyIdsArray: [],
      web3: {},
      policiesList: [],
      policyId: '',
      claimDate: '',
      hospitalName: '',
      description: '',
      amount: 0,
      claimHash: '',
      policy:{},
      claimsList: [],
      showPolicyModal: false,
      showClaimModal: false
    };

    this.handleChange = this.handleChange.bind(this);
    this.handlePolicySubmit = this.handlePolicySubmit.bind(this);
    this.loadBlockchainData = this.loadBlockchainData.bind(this);
    this.policyList = this.policyList.bind(this);
    this.handleSelectPolicyType = this.handleSelectPolicyType.bind(this);
    this.handleFileChange = this.handleFileChange.bind(this);
    this.handleClaimSubmit = this.handleClaimSubmit.bind(this); 
    this.handleClaimList = this.handleClaimList.bind(this);
    this.handlePolicyId = this.handlePolicyId.bind(this);
    this.handleClaimButton = this.handleClaimButton.bind(this);
    this.depositer = this.depositer.bind(this);
    this.withdrawer = this.withdrawer.bind(this);
    this.burned = this.burned.bind(this);
    this.exiter = this.exiter.bind(this);
    this.getMaticClient = this.getMaticClient.bind(this);
    this.port = this.port.bind(this);
    this.deactivatePolicy = this.deactivatePolicy.bind(this);
  
  }
  async componentWillMount() {
    let today = new Date();
    let date = today.getFullYear() + '/' + (today.getMonth() + 1) + '/' + today.getDate() + '-' + today.getHours() +':' + today.getMinutes();
    this.setState({
      claimDate: date
    })

    if(this.props.loginstatus === true)
    {
      await this.setState({
        policy: this.props.policy,
        web3: this.props.web3,
        portis: this.props.portis,
        account: this.props.account
      })
      await this.loadBlockchainData();
      await this.handlePoliciesLoop();
      await this.handleClaimsLoop();
    }
  }

  async getMaticClient(_network = "testnet", _version = "mumbai") {
    console.log({
        network: _network,
        version: _version,
        parentProvider: this.state.portisGoerli.provider,
        maticProvider: this.state.portisMumbai.provider,  
        parentDefaultOptions:  this.state.account , 
        maticDefaultOptions: this.state.account,
    }); 

    const network = new Network(_network, _version);
    const matic = new Matic({
        network: _network,
        version: _version,
        parentProvider: this.state.portisGoerli.provider,
        maticProvider: this.state.portisMumbai.provider,  
        parentDefaultOptions:  this.state.account , 
        maticDefaultOptions: this.state.account,
    });
    await matic.initialize();       
    return { matic, network };
  }

  async loadBlockchainData(){
    const portisMumbai = new Portis('a16b70b3-8f7c-49cc-b33f-98db6607f425', {
        nodeUrl: 'https://rpc-mumbai.matic.today', 
        chainId: 80001
    });
    const portisGoerli = new Portis('a16b70b3-8f7c-49cc-b33f-98db6607f425', {
        nodeUrl: 'https://rpc.goerli.mudit.blog/', 
        chainId: 5
    });
    this.setState({
        portisMumbai: portisMumbai,
        portisGoerli: portisGoerli
    })

    const policy = new this.state.web3.eth.Contract(Policy, this.props.address);
    this.setState({policy});

    let a = await this.state.policy.methods.getPolicyTypes().call({from: this.state.account});
    this.setState({
      policyTypes: a
    })

    let c = await this.state.policy.methods.getUserPolicies(
      this.state.account)
    .call({from: this.state.account});

    this.setState({
      policyIdsArray: c,
    })
  }

  async handleFileChange(event){
    event.preventDefault()
    try{
      const file = event.target.files[0]
      const reader = new window.FileReader()
      reader.readAsArrayBuffer(file)
      reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('buffer', this.state.buffer)
      }
    } 
    catch(err){
      console.log(err)
    }
  }

  async handlePolicySubmit (event){
    event.preventDefault()
    try{
      console.log("Submitting file to ipfs...")
      ipfs.add(this.state.buffer, (error, result) => {
        console.log('Ipfs result', result)
        if(error) {
          console.error(error)
          return
        }
        this.setState({ hash: result[0].hash })
        const policy = new this.state.web3.eth.Contract(Policy, this.props.address);
        policy.methods.createPolicy(
          this.state.hash, this.state.policySelected)
        .send({from: this.state.account, gas:500000, gasPrice:10000000000})
        .then ((receipt) => {
          console.log(receipt);
          this.hidePolicyModal();
        })
        .catch((err)=> {
          console.log(err);
          this.hidePolicyModal();
        });
      })
    } catch(err) {
      console.log(err);
      this.hidePolicyModal();
    }
    
  }

  async handleClaimButton (id) {
    this.setState({
      policyId: id
    })
    this.showClaimModal()
  }

  async handleClaimSubmit (){
    try{
      console.log("Submitting file to ipfs...")
      ipfs.add(this.state.buffer, (error, result) => {
        console.log('Ipfs result', result)
        if(error) {
          console.error(error)
          return
        }
        this.setState({ claimHash: result[0].hash })
        const policy = new this.state.web3.eth.Contract(Policy, this.props.address);
        policy.methods.claimPolicy(
          this.state.policyId, 
          this.state.claimDate,
          this.state.hospitalName,
          this.state.description,
          this.state.amount,
          this.state.claimHash)
        .send({from: this.state.account, gas:500000, gasPrice:10000000000})
        .then ((receipt) => {
          console.log(receipt);
          this.hideClaimModal();
        })
        .catch((err)=> {
          console.log(err);
        });
      })
    }
    catch(err) {
      console.log(err);
    }
  }


  handleChange (evt) {
    this.setState({ [evt.target.name]: evt.target.value });
  }

  async handleSelectPolicyType (evt) {
    await this.setState({ policySelected: evt.target.value });
  }

  async deactivatePolicy(id){
    await this.state.policy.methods.burn(id)
        .call({from: this.state.account});
  }

  async handlePoliciesLoop(){
    var ids = this.state.policyIdsArray;
    var arr = [];
    for(let i = 0; i <ids.length; i++) {
      let id = ids[i];
      let details = await this.state.policy.methods.getPolicy(id)
        .call({from: this.state.account});
      if(details[6]==true){
        arr.push(details);
      }
    }
    this.setState({
      policiesList: arr
    })
  }

  async handleClaimsLoop(){
    var ids = this.state.policyIdsArray;
    var arr = [];
    for(let i = 0; i <ids.length; i++) {
      let details = await this.state.policy.methods.getPolicy(ids[i])
        .call({from: this.state.account});
      let allclaims = details[5];
      for (let j = 0; j<allclaims.length;j++){
        let cl = await this.state.policy.methods.getClaim(allclaims[j])
        .call({from: this.state.account});
        arr.push(cl);
      }
    }
    this.setState({
      claimsList: arr
    })
  }

  async burned(id) {
    
    console.log('asaa');
    const { matic, network } = await this.getMaticClient();
 
    console.log(matic);
    console.log(network);
    // burning erc721 tokens are also supported
    //Matic chain address
    const token = this.props.address;
    console.log(this.props.address);
    console.log(this.state.account);


    // or provide the tokenId in case of an erc721
    const tokenId = id;
    const hash = await matic.startWithdrawForNFT(token, tokenId, { from:this.state.account});
    await this.setState({
        hash: hash.transactionHash
    });
    console.log(hash.transactionHash);
    console.log(this.state.hash);
    localStorage.setItem('hash',this.state.hash);
    this.deactivatePolicy(id); 
    setTimeout(this.port(), 1200000);   
  }

  async port(){
    await this.withdrawer();
    await this.exiter();
    await this.depositer();
  }  

  async withdrawer() {
      const hash1 = localStorage.getItem('hash');
      console.log(hash1);  
      const { matic, network } = await this.getMaticClient();
      
          // provide the burn tx hash
      const chash = await matic.withdrawNFT(hash1, { from: this.state.account , gas: "2000000" });
      console.log(chash.transactionHash);
      localStorage.setItem('chash',chash.transactionHash);
  }

// Withdraw process is completed, funds will be transfered to your account after challege period is over.

  async exiter() {
      const { matic, network } = await this.getMaticClient();
      
      //Goerli chain address
      const token = "0xD22b4C3D639d85C255449Dc535B523a214219E0E";
      const phash = await matic.processExits(token, { from: this.state.account, gas: 7000000 })
      console.log(phash.transactionHash);
      localStorage.setItem('phash',phash.transactionHash);
  }

  async depositer(id){
      const { matic, network } = await this.getMaticClient();
      console.log(this.state.account)
      const token = "0xD22b4C3D639d85C255449Dc535B523a214219E0";
      const tokenId = id;

      await matic.approveERC20TokensForDeposit(token, tokenId,{ from: this.state.account }).then((res) => {
      console.log("approve hash: ", res.transactionHash);
      });

      await matic.safeDepositERC721Tokens(token, tokenId, { from: this.state.account }).then((res) => {
      console.log("desposit hash: ", res.transactionHash);
      });
  }

  policyList() {
    return this.state.policiesList.map(currentpolicy => {
      return <PolicyCard policyCard={currentpolicy} 
      handleClaimButton = {this.handleClaimButton} 
      handlePortButton = {this.burned}
      key={currentpolicy[0]}/>;
    })
  }

  optionsList() {
    return this.state.policyTypes.map(currenttype => {
      return <OptionCard opt={currenttype} key={currenttype}/>;
    })
  }

  policyOptionsList() {
    return this.state.policyIdsArray.map(currentpol => {
      return <PolicyOptions opt={currentpol} key={currentpol}/>;
    })
  }

  async handlePolicyId (evt) {
    await this.setState({ policyId: evt.target.value });
  }

  handleClaimList() {
    return this.state.claimsList.map(currentclaim => {
      return <ClaimCard claimCard={currentclaim} key={currentclaim[0]}/>;
    })
  }

  hidePolicyModal = (e) => {
    this.setState({
      showPolicyModal: false,
    });
  };

  showPolicyModal = (e) => {
    this.setState({
      showPolicyModal: true,
    });
  };

  hideClaimModal = (e) => {
    this.setState({
      showClaimModal: false,
    });
  };

  showClaimModal = (e) => {
    this.setState({
      showClaimModal: true,
    });
  };


  render() {

    return (
      <div>
        <div style={{marginLeft: "80px",marginTop: "20px"}} align="center">
        
        <div align = "center">
          <Modal
            show={this.state.showPolicyModal}
            onHide={this.hidePolicyModal}
            align="center"
          >
            <Modal.Header>
              <Modal.Title><b>BUY POLICY</b></Modal.Title>
            </Modal.Header>
            <Modal.Body>
            <Card>
              <Card.Content>
                <Card.Header>Buy Policy</Card.Header>
                <Card.Description>  
                <div>
                <div>
                  <Form>
                    <Form.Group widths='equal'>
                      <Form.Field>
                        <div>
                          <strong>Policy Type</strong>
                          <select id="typespolicy" onChange={this.handleSelectPolicyType}
                            style = {{
                              width: "equal"
                            }}
                            >
                            <option value="None" defaultValue>
                              {"None"}
                            </option>
                            {this.optionsList()}
                          </select>
                        </div>
                      </Form.Field>
                    </Form.Group>
                  </Form>
                </div>
                <div >
                  <Form>
                    <Form.Group widths='equal'>
                      <Form.Field
                        id='form-input-control-documenthash'
                        control={Input}
                        label='KYC Document'
                        name="hash"
                      >
                        <input type="file" onChange={this.handleFileChange} />
                      </Form.Field>
                    </Form.Group>
                  </Form>
                </div>
                  </div>
                </Card.Description>
              </Card.Content>
            </Card>
            </Modal.Body>
            <Modal.Footer>
              <Card.Content extra>
                  <div className='ui two buttons' style={{paddingRight: "20px"}}>
                    <Button onClick={this.handlePolicySubmit} basic color='green'>
                      BUY
                    </Button>
                    <div style={{paddingRight: "20px"}}></div>
                    <Button onClick={this.hidePolicyModal} basic color='red' >
                      CANCEL
                    </Button>
                  </div>
                </Card.Content>
            </Modal.Footer>
          </Modal>
        </div>
        <div align = "center">
          <Modal
            show={this.state.showClaimModal}
            onHide={this.hideClaimModal}
            align="center"
          >
            <Modal.Header>
              <Modal.Title><b>CLAIM POLICY</b></Modal.Title>
            </Modal.Header>
            <Modal.Body>
            <div>
              <div>
                <div >
                  <div style={{fontSize:"20px"}}>
                    <strong>Claim Policy</strong>
                  </div>
                  <br></br>
                  <div >
                    <Form>
                      <Form.Group widths='equal'>
                        <Form.Field
                          id='form-input-control-polid'
                          control={Input}
                          label='Policy Id'
                          name="id"
                          value={this.state.policyId}   
                        />
                        <Form.Field
                          id='form-input-control-claimdate'
                          control={Input}
                          label='Claim Date'
                          name="claimDate"
                          value={this.state.claimDate}
                        /> 
                        
                      </Form.Group>
                    </Form>
                  </div>
                  
                  <div >
                    <Form>
                      <Form.Group widths='equal'>
                        <Form.Field
                          id='form-input-control-hospitalname'
                          control={Input}
                          label='Hospital Name'
                          placeholder='Hospital Name'
                          name="hospitalName"
                          onChange={this.handleChange}
                        />
                        
                        <Form.Field
                          id='form-input-control-description'
                          control={Input}
                          label='Description'
                          placeholder='Description'
                          name="description"
                          onChange={this.handleChange}
                        />
                      </Form.Group>
                    </Form>
                  </div>
                  <div >
                    <Form>
                      <Form.Group widths='equal'>
                        <Form.Field
                          id='form-input-control-amount'
                          control={Input}
                          label='Amount'
                          placeholder='Amount'
                          name="amount"
                          onChange={this.handleChange}
                        />
                        <Form.Field
                          id='form-input-control-claimdochash'
                          control={Input}
                          label='Upload Claim Docs'
                          name="claimHash"
                        >
                          <input style={{width: "90px"}} type="file" onChange={this.handleFileChange} />
                        </Form.Field>
                        
                      </Form.Group>
                    </Form>
                  </div>
                </div>
              </div>
            </div>
            
            </Modal.Body>
            <Modal.Footer>
              <Card.Content extra>
                  <div className='ui two buttons' style={{paddingRight: "20px"}}>
                    <Button onClick={this.handleClaimSubmit} basic color='green'>
                      BUY
                    </Button>
                    <div style={{paddingRight: "20px"}}></div>
                    <Button onClick={this.hideClaimModal} basic color='red'>
                      CANCEL
                    </Button>
                  </div>
                </Card.Content>
            </Modal.Footer>
          </Modal>
        </div>
        <br></br>
          </div>
          <div style={{paddingLeft: "20px", paddingRight: "20px"}}>
            <div style={{fontSize:"20px", position:"center",PaddingBottom: "10px"}} align = "center"></div>
              <div style={{fontSize:"20px", display:"inline-block", paddingLeft: "20px"}}>
                <strong>My Policies</strong>
              </div>
              <div style={{display:"inline-block", float: "right"}}>
                <Button onClick={this.showPolicyModal} basic color='blue'>
                  BUY POLICY
                </Button>
              </div>
              <table className="ui celled table ">
                <thead>
                <tr>
                  <th>Policy Id</th>
                  <th>Customer ID</th>
                  <th>Policy Type</th>
                  <th>KYC Hash</th>
                  <th>Action</th>
                </tr></thead>
                <tbody>
                  { this.policyList() }
                </tbody>
              </table>
          </div>
          <br></br>
          <div style={{padding:"20px"}}>
            <div style={{fontSize:"20px", position:"center"}} align = "center"></div>
              <div style={{fontSize:"20px", position:"center", display:"inline-block", paddingLeft: "20px"}} align = "center">
                <strong>My Claims</strong>
              </div>
              <table className="ui celled table ">
                <thead>
                  <tr>
                    <th>ClaimId</th>
                    <th>PolicyId</th>
                    <th>Date</th>
                    <th>Hospital Name</th>
                    <th>Description</th>
                    <th>Docs</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  { this.handleClaimList() }
                </tbody>
              </table>
          </div>  
          
        
      </div>
    );
  }
}

export default CreatePolicyDash;