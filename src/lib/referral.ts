import { db } from './firebase';
import { doc, getDoc, updateDoc, increment, query, collection, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export const distributeCommission = async (newUser: any) => {
    if (!newUser.referredBy) return;

    try {
        // Fetch commission settings
        const settingsDoc = await getDoc(doc(db, 'settings', 'commission'));
        const commissions = settingsDoc.exists() ? settingsDoc.data() : { gen1: 50, gen2: 30, gen3: 20 };
        console.log("Distributing commissions with settings:", commissions);

        let currentRefCode = newUser.referredBy?.toUpperCase();
        
        for (let i = 1; i <= 3; i++) {
            if (!currentRefCode) break;

            // Find Referrer
            const usersQuery = query(collection(db, 'users'), where('referralCode', '==', currentRefCode));
            const snap = await getDocs(usersQuery);
            
            if (snap.empty) break;
            
            const referrerDoc = snap.docs[0];
            const referrerRef = doc(db, 'users', referrerDoc.id);
            
            // Add commission
            const commissionAmount = Number(commissions[`gen${i}`]) || 0;
            console.log(`Adding ${commissionAmount} to user ${referrerDoc.data().name} (Gen ${i})`);
            
            await updateDoc(referrerRef, { 
                balance: increment(commissionAmount)
            });

            // Log Transaction
            await addDoc(collection(db, 'transactions'), {
                userId: referrerDoc.id,
                amount: commissionAmount,
                type: `commission_gen${i}`,
                createdAt: serverTimestamp()
            });

            // Move to next generation
            currentRefCode = referrerDoc.data().referredBy?.toUpperCase();
        }
        console.log("Commission distribution completed successfully.");
    } catch (e) {
        console.error("Commission distribution failed", e);
    }
};
