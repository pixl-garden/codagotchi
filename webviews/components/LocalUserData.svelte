<!-- TODO -->

<script context="module">
  import { Inventory } from './Inventory.svelte';

  export class LocalUserData {
    constructor(userData){
      this.uid = userData.uid;
      this.username = userData.username;
      this.profile = {
        photoURL: userData.profile.photoURL,
        createdAt: userData.profile.createdAt,
        lastLoginAt: userData.profile.lastLoginAt,
        level: userData.profile.level,
        experience: userData.profile.experience,
      };
      this.friends = userData.friends;
      // this.inventory = userData.inventory;
    }
  }
</script>