import { collection, getDocs, addDoc, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

const SAMPLE_ARTWORKS = [
    {
        title: 'Neon Cyberpunk City',
        description: 'A futuristic cityscape bathed in neon lights and rain.',
        imageUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=800&q=80',
        price: 150,
        medium: 'Digital Painting',
        artworkType: 'digital',
        quantity: 10
    },
    {
        title: 'Abstract Thoughts #42',
        description: 'An exploration of color and form in the abstract expressionist style.',
        imageUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=800&q=80',
        price: 450,
        medium: 'Oil on Canvas',
        artworkType: 'physical',
        quantity: 1
    },
    {
        title: 'Serene Mountain Valley',
        description: 'A peaceful landscape capturing the morning mist over the mountains.',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        price: 75,
        medium: 'High Quality Print',
        artworkType: 'print',
        quantity: 50
    },
    {
        title: 'Glitch in the Matrix',
        description: 'A digital art piece exploring the concept of simulated reality.',
        imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
        price: 300,
        medium: 'Digital Art',
        artworkType: 'digital',
        quantity: 1
    },
    {
        title: 'Golden Hour Portrait',
        description: 'A stunning portrait captured during the golden hour.',
        imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80',
        price: 200,
        medium: 'Digital Photography',
        artworkType: 'digital',
        quantity: 5
    },
    {
        title: 'Geometric Harmony',
        description: 'Precise geometric shapes creating a sense of balance and order.',
        imageUrl: 'https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&w=800&q=80',
        price: 550,
        medium: 'Acrylic on Wood',
        artworkType: 'physical',
        quantity: 1
    },
    {
        title: 'Urban Decay',
        description: 'A gritty look at the beauty found in abandoned urban spaces.',
        imageUrl: 'https://images.unsplash.com/photo-1475965894430-b05c9d646042?auto=format&fit=crop&w=800&q=80',
        price: 120,
        medium: 'Limited Edition Print',
        artworkType: 'print',
        quantity: 25
    },
    {
        title: 'Cosmic Journey',
        description: 'A surreal journey through the cosmos.',
        imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=80',
        price: 800,
        medium: 'Digital Art',
        artworkType: 'digital',
        quantity: 1
    },
    {
        title: 'Floral Symphony',
        description: 'Vibrant flowers arranged in a chaotic yet beautiful symphony.',
        imageUrl: 'https://images.unsplash.com/photo-1490750967868-58cb75069ed6?auto=format&fit=crop&w=800&q=80',
        price: 350,
        medium: 'Watercolor',
        artworkType: 'physical',
        quantity: 1
    },
    {
        title: 'Minimalist Waves',
        description: 'Simple lines evoking the calming motion of ocean waves.',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        price: 90,
        medium: 'Giclee Print',
        artworkType: 'print',
        quantity: 100
    }
]

export const seedMarketplace = async () => {
    try {
        // 1. Fetch existing artists
        const q = query(collection(db, 'users'), where('role', '==', 'artist'))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            console.error('No artists found! Please create an artist account first.')
            alert('No artists found! Please create an artist account first.')
            return
        }

        const artists = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unknown Artist'
        }))

        console.log(`Found ${artists.length} artists to assign artworks to.`)

        // 2. Add artworks
        let addedCount = 0
        for (const artwork of SAMPLE_ARTWORKS) {
            // Randomly assign an artist
            const randomArtist = artists[Math.floor(Math.random() * artists.length)]

            const newArtwork = {
                ...artwork,
                artistId: randomArtist.id,
                artistName: randomArtist.name,
                forSale: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            await addDoc(collection(db, 'artworks'), newArtwork)
            addedCount++
        }

        console.log(`Successfully seeded ${addedCount} artworks!`)
        alert(`Successfully seeded ${addedCount} artworks!`)
        window.location.reload()

    } catch (error) {
        console.error('Error seeding marketplace:', error)
        alert('Error seeding marketplace. Check console for details.')
    }
}
